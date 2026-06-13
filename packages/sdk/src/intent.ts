// Intents and phases of scripted enemies.
//
// An intent is two distinct fields: amount is the telegraph (the number over
// the enemy's head, pure presentation), the work is done by on_execute. The
// intent.attack(6) sugar wires both in sync; the custom form lets them
// deliberately diverge:
//
//   intent('attack', {
//     amount: ({ self }) => self.state.fury.add(3),
//     execute({ self }) {
//       dmg('selected', self.state.fury.add(3))
//       self.state.fury.inc(1)
//     },
//   })

import { assertValue, type Cond, type ExprLike } from './core/expr'
import {
	type BattlePaths,
	battlePaths,
	type SelfPaths,
	selfPaths,
	targetPaths,
	type UnitPaths,
} from './core/paths'
import { collect, RiftedBuildError } from './core/scope'
import { dmg } from './effects'
import { type HookDef, resolveWhen } from './hooks'

export interface IntentCtx {
	readonly self: SelfPaths
	readonly target: UnitPaths
	readonly battle: BattlePaths
}

function intentCtx(): IntentCtx {
	return { self: selfPaths(), target: targetPaths(), battle: battlePaths() }
}

/** an intent ready for serialization */
export interface IntentDef {
	readonly kind: string
	readonly amount?: unknown
	readonly on_execute?: unknown
}

export interface IntentSpec {
	/** the telegraph: what to show the player ("will hit for 7") */
	amount?: ExprLike<'battle'> | ((ctx: IntentCtx) => ExprLike<'battle'>)
	/** what actually happens during the AI phase */
	execute?: (ctx: IntentCtx) => void
}

function makeIntent(kind: string, spec: IntentSpec = {}): IntentDef {
	if (kind === '') throw new RiftedBuildError('intent(): kind must be non-empty')
	const def: { kind: string; amount?: unknown; on_execute?: unknown } = { kind }
	if (spec.amount !== undefined) {
		const amount = typeof spec.amount === 'function' ? spec.amount(intentCtx()) : spec.amount
		assertValue(amount, `intent ${kind} amount`)
		def.amount = amount
	}
	if (spec.execute) {
		const exec = spec.execute
		def.on_execute = collect(`intent ${kind}`, () => exec(intentCtx()))
	}
	return def
}

/**
 * intent factory: intent('kind', {...}) for custom ones, intent.attack(n) /
 * intent.charge() / intent.idle() for the common shapes
 */
export const intent = Object.assign(makeIntent, {
	/** hit the selected target: telegraph and execution wired to one value */
	attack(amount: ExprLike<'battle'>): IntentDef {
		return makeIntent('attack', { amount, execute: () => dmg('selected', amount) })
	},
	charge(): IntentDef {
		return makeIntent('charge')
	},
	idle(): IntentDef {
		return makeIntent('idle')
	},
})

// --- phases ---

export interface PhaseCtx {
	readonly self: SelfPaths
	readonly target: UnitPaths
	readonly battle: BattlePaths
}

export interface PhaseSpec {
	/** transition condition to the next phase (checked at the enemy's turn start) */
	until?: Cond<'battle'> | ((ctx: PhaseCtx) => Cond<'battle'>)
	/** phase entry effect */
	onEnter?: (ctx: PhaseCtx) => void
	/** intent rotation */
	steps?: IntentDef[]
	/** hooks live only while the phase is active */
	hooks?: HookDef[]
}

export interface PhaseDef {
	readonly name?: string
	readonly until?: unknown
	readonly on_enter?: unknown
	readonly steps?: IntentDef[]
	readonly hooks?: HookDef[]
}

export function phase(spec: PhaseSpec): PhaseDef
export function phase(name: string, spec: PhaseSpec): PhaseDef
export function phase(nameOrSpec: string | PhaseSpec, maybeSpec?: PhaseSpec): PhaseDef {
	const name = typeof nameOrSpec === 'string' ? nameOrSpec : undefined
	const spec = typeof nameOrSpec === 'string' ? (maybeSpec ?? {}) : nameOrSpec

	const ctx: PhaseCtx = { self: selfPaths(), target: targetPaths(), battle: battlePaths() }
	const def: {
		name?: string
		until?: unknown
		on_enter?: unknown
		steps?: IntentDef[]
		hooks?: HookDef[]
	} = {}
	if (name !== undefined) def.name = name
	const until = resolveWhen(spec.until, ctx)
	if (until) def.until = until
	if (spec.onEnter) {
		const enter = spec.onEnter
		def.on_enter = collect(`phase ${name ?? '<unnamed>'} onEnter`, () => enter(ctx))
	}
	if (spec.steps) def.steps = spec.steps
	if (spec.hooks) def.hooks = spec.hooks
	return def
}
