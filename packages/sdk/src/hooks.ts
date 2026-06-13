// Hooks — authored listeners. on() collects the body immediately (one
// synchronous pass) and returns data; whether a hook is live in battle is
// decided by the engine's world walk, not by any registration.
//
//   hooks: [
//     on('damage_intent', { scope: 'targeted', when: ({ battle }) => battle.turn.gt(1) },
//       () => mulDamage(0.75)),
//   ]

import { HOOK_SCOPES, type HookScope } from './core/dict'
import { EventHandle } from './core/event-handle'
import { type BuiltinEventName, type BuiltinEvents, isBuiltinEvent } from './core/events'
import { type Cap, Cond } from './core/expr'
import {
	type BattlePaths,
	battlePaths,
	type CardPaths,
	cardPaths,
	type EventExprs,
	eventPaths,
	type ModPaths,
	modPaths,
	type Params,
	type PlayerPaths,
	playerPaths,
	type SelfPaths,
	selfPaths,
	targetPaths,
	type UnitPaths,
} from './core/paths'
import { collect, consumeCond, RiftedBuildError } from './core/scope'

/** what to subscribe to: a builtin event, a package handle, or a full kind */
export type EventSpec = BuiltinEventName | EventHandle<Params> | (string & {})

export type { HookScope } from './core/dict'

export type PayloadOf<E> = E extends BuiltinEventName
	? BuiltinEvents[E]
	: E extends EventHandle<infer S>
		? S
		: Record<string, number>

export interface HookCtx<E extends EventSpec = EventSpec> {
	readonly event: EventExprs<PayloadOf<E>>
	readonly self: SelfPaths
	readonly target: UnitPaths
	readonly battle: BattlePaths
	readonly player: PlayerPaths
	/** the hook's carrier card (for card hooks and card-seal hooks) */
	readonly card: CardPaths
	/** the carrier modifier (modifier hooks only; elsewhere the engine yields 0) */
	readonly mod: ModPaths
}

export interface HookOpts<E extends EventSpec = EventSpec> {
	/** whose perspective: subject (engine default), targeted, allied, global */
	scope?: HookScope
	when?: Cond<Cap> | ((ctx: HookCtx<E>) => Cond<Cap>)
}

/** a collected hook: data ready to serialize into GCF */
export interface HookDef {
	readonly on: string
	readonly scope?: HookScope
	readonly when?: Cond<Cap>
	readonly do: unknown
}

export function eventKindOf(spec: EventSpec, ns?: string): string {
	if (spec instanceof EventHandle) return spec.kind
	if (isBuiltinEvent(spec) || spec.includes(':')) return spec
	throw new RiftedBuildError(
		`unknown event "${spec}" — builtin events are fixed, custom ones need a namespace` +
			(ns ? ` (did you mean pkg.event('${spec}') → "${ns}:${spec}"?)` : ''),
	)
}

export function hookCtx<E extends EventSpec>(): HookCtx<E> {
	return {
		event: eventPaths<PayloadOf<E>>(),
		self: selfPaths(),
		target: targetPaths(),
		battle: battlePaths(),
		player: playerPaths(),
		card: cardPaths(),
		mod: modPaths(),
	}
}

export function resolveWhen<C>(
	when: Cond<Cap> | ((ctx: C) => Cond<Cap>) | undefined,
	ctx: C,
): Cond<Cap> | undefined {
	if (when === undefined) return undefined
	const cond = typeof when === 'function' ? when(ctx) : when
	if (!(cond instanceof Cond)) {
		throw new RiftedBuildError('when: expected a Cond (e.g. battle.turn.gt(1))')
	}
	consumeCond(cond)
	return cond
}

export function on<E extends EventSpec>(event: E, cb: (ctx: HookCtx<E>) => void): HookDef
export function on<E extends EventSpec>(
	event: E,
	opts: HookOpts<E>,
	cb: (ctx: HookCtx<E>) => void,
): HookDef
export function on<E extends EventSpec>(
	event: E,
	optsOrCb: HookOpts<E> | ((ctx: HookCtx<E>) => void),
	maybeCb?: (ctx: HookCtx<E>) => void,
): HookDef {
	const opts = typeof optsOrCb === 'function' ? {} : optsOrCb
	const cb = typeof optsOrCb === 'function' ? optsOrCb : maybeCb
	if (typeof cb !== 'function') throw new RiftedBuildError('on(): missing hook body callback')
	if (opts.scope !== undefined && !HOOK_SCOPES.includes(opts.scope)) {
		throw new RiftedBuildError(
			`on(): unknown scope "${opts.scope}" (known: ${HOOK_SCOPES.join(', ')})`,
		)
	}

	const kind = eventKindOf(event)
	const ctx = hookCtx<E>()
	const body = collect(`hook on ${kind}`, () => cb(ctx))
	if (body === null) {
		throw new RiftedBuildError(`hook on ${kind}: body is empty — a hook must do something`)
	}

	const def: { on: string; scope?: HookScope; when?: Cond<Cap>; do: unknown } = {
		on: kind,
		do: body,
	}
	if (opts.scope !== undefined) def.scope = opts.scope
	const when = resolveWhen(opts.when, ctx)
	if (when) def.when = when
	return def
}
