import { type Expr, wrapExpr } from '../../helpers/expr'
import { wrapEffect } from '../../internal/wrap-effect'
import type { Condition } from '../../schema/condition'
import type { Effect } from '../../schema/effect'
import type { MultiTarget } from '../../schema/enums'
import type { Value } from '../../schema/value'
import { Get } from '../value'

/** execute effects in order */
export function Sequence(effects: Effect[]): Effect {
	if (effects.length < 1) throw new Error('Sequence requires at least 1 effect')
	return { do: 'sequence', effects }
}

/** execute the same effect N times. count is evaluated once before the loop */
export function Repeat(opts: { count: Value; effect: Effect | Effect[] }): Effect {
	return { do: 'repeat', count: opts.count, effect: wrapEffect(opts.effect) }
}

/** conditional effect. else is optional — false branch is a no-op when omitted */
export function If(opts: {
	condition: Condition
	then: Effect | Effect[]
	else?: Effect | Effect[]
}): Effect {
	const out: any = { do: 'if', condition: opts.condition, then: wrapEffect(opts.then) }
	if (opts.else !== undefined) out.else = wrapEffect(opts.else)
	return out
}

/**
 * bind named values once, reuse them inside the body via `let.<name>`.
 *
 * Two forms:
 * - object form: `Let({ bindings: { x: ... }, in: Dmg(Get('let.x')) })`
 * - callback form (preferred): `Let({ x: ... }, ({ x }) => Dmg(x))` — `x` arrives as a
 *   typed `Expr`, so there is no stringly-typed `let.x` path to mistype.
 */
export function Let(opts: { bindings: Record<string, Value>; in: Effect | Effect[] }): Effect
export function Let<K extends string>(
	bindings: Record<K, Value>,
	body: (refs: { readonly [P in K]: Expr }) => Effect | Effect[],
): Effect
export function Let(a: any, b?: any): Effect {
	if (typeof b === 'function') {
		const bindings = a as Record<string, Value>
		const refs: Record<string, Expr> = {}
		for (const k of Object.keys(bindings)) refs[k] = wrapExpr(Get(`let.${k}`))
		return { do: 'let', bindings, in: wrapEffect(b(refs)) }
	}
	const opts = a as { bindings: Record<string, Value>; in: Effect | Effect[] }
	return { do: 'let', bindings: opts.bindings, in: wrapEffect(opts.in) }
}

/** the iterated entity inside a Foreach callback. fields read the current target */
export interface ForeachItem {
	/** current entity hp (target.hp) */
	hp: Expr
	/** current entity max hp (target.max_hp) */
	maxHp: Expr
	/** current entity hp percent (target.hp_percent) */
	hpPercent: Expr
	/** current entity block (target.block) */
	block: Expr
	/** current entity id, as bound to the iteration variable (let.<as>) */
	id: Expr
}

let foreachCounter = 0

function makeForeachItem(as: string): ForeachItem {
	// inside a foreach the engine sets the current entity as the selected target,
	// so per-entity fields are read via target.*; the `as` binding holds the id.
	return {
		hp: wrapExpr(Get('target.hp')),
		maxHp: wrapExpr(Get('target.max_hp')),
		hpPercent: wrapExpr(Get('target.hp_percent')),
		block: wrapExpr(Get('target.block')),
		id: wrapExpr(Get(`let.${as}`)),
	}
}

/**
 * iterate over a target group. each iteration runs the effect with the current
 * entity as the selected target.
 *
 * Two forms:
 * - object form: `Foreach({ targets: 'all_enemies', as: 'e', effect: ... })`
 * - callback form (preferred): `Foreach('all_enemies', e => Dmg(e.hp.times(0.1)))` —
 *   `e.hp`/`e.block`/… read the current entity and the binding name is generated.
 */
export function Foreach(opts: {
	targets: MultiTarget
	as: string
	effect: Effect | Effect[]
}): Effect
export function Foreach(
	targets: MultiTarget,
	body: (item: ForeachItem) => Effect | Effect[],
): Effect
export function Foreach(a: any, b?: any): Effect {
	if (typeof b === 'function') {
		const as = `it${foreachCounter++}`
		return {
			do: 'foreach',
			targets: a as MultiTarget,
			as,
			effect: wrapEffect(b(makeForeachItem(as))),
		}
	}
	const opts = a as { targets: MultiTarget; as: string; effect: Effect | Effect[] }
	return { do: 'foreach', targets: opts.targets, as: opts.as, effect: wrapEffect(opts.effect) }
}

/** pick one effect at uniform probability. for weighted selection use Chance() */
export function Random(options: Effect[]): Effect {
	if (options.length < 2) throw new Error('Random requires at least 2 options')
	return { do: 'random', options }
}

/** weighted random. probability = weight / sum(weights) */
export function Chance(options: Array<{ weight: number; effect: Effect }>): Effect {
	if (options.length < 2) throw new Error('Chance requires at least 2 options')
	return { do: 'chance', options }
}

/** fire a custom event. listeners with matching on_event react, including those in other mods */
export function EmitEvent(opts: { event: string; payload?: Record<string, Value> }): Effect {
	const out: any = { do: 'emit_event', event: opts.event }
	if (opts.payload !== undefined) out.payload = opts.payload
	return out
}

/** schedule an effect N turns from now. context is captured at scheduling time */
export function TriggerAfter(opts: { turns: number; effect: Effect | Effect[] }): Effect {
	if (opts.turns < 1 || opts.turns > 10) throw new Error('TriggerAfter turns must be 1–10')
	return { do: 'trigger_after', turns: opts.turns, effect: wrapEffect(opts.effect) }
}
