import type { Condition } from '../../schema/condition'
import type { Effect } from '../../schema/effect'
import type { MultiTarget } from '../../schema/enums'
import type { Value } from '../../schema/value'

/** execute effects in order */
export function Sequence(effects: Effect[]): Effect {
	if (effects.length < 1) throw new Error('Sequence requires at least 1 effect')
	return { do: 'sequence', effects }
}

/** execute the same effect N times. count is evaluated once before the loop */
export function Repeat(opts: { count: Value; effect: Effect }): Effect {
	return { do: 'repeat', count: opts.count, effect: opts.effect }
}

/** conditional effect. else is optional — false branch is a no-op when omitted */
export function If(opts: { condition: Condition; then: Effect; else?: Effect }): Effect {
	const out: any = { do: 'if', condition: opts.condition, then: opts.then }
	if (opts.else !== undefined) out.else = opts.else
	return out
}

/** bind named values once, reuse them inside the in effect via let.<name> */
export function Let(opts: { bindings: Record<string, Value>; in: Effect }): Effect {
	return { do: 'let', bindings: opts.bindings, in: opts.in }
}

/** iterate over a target group. each iteration runs effect in that entity's context */
export function Foreach(opts: { targets: MultiTarget; as: string; effect: Effect }): Effect {
	return {
		do: 'foreach',
		targets: opts.targets,
		as: opts.as,
		effect: opts.effect,
	}
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
export function TriggerAfter(opts: { turns: number; effect: Effect }): Effect {
	if (opts.turns < 1 || opts.turns > 10) throw new Error('TriggerAfter turns must be 1–10')
	return { do: 'trigger_after', turns: opts.turns, effect: opts.effect }
}
