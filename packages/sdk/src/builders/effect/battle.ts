import type { Effect } from '../../schema/effect'
import type { DamageModifierKind, Target } from '../../schema/enums'
import type { Value } from '../../schema/value'

/** deal damage to a target. amount supports stack scaling via Scaled() */
export function Damage(opts: { target: Target; amount: Value }): Effect {
	return { do: 'damage', target: opts.target, amount: opts.amount }
}

/** gain block on a target. target defaults to self */
export function GainBlock(opts: { target?: Target; amount: Value }): Effect {
	const out: any = { do: 'gain_block', amount: opts.amount }
	if (opts.target !== undefined) out.target = opts.target
	return out
}

/** deal damage to self, bypassing block */
export function SelfDamage(amount: Value): Effect {
	return { do: 'self_damage', amount }
}

/** apply a buff to a target. duration -1 = permanent. snapshot copies Values into buff.state at apply time */
export function ApplyBuff(opts: {
	target: Target
	buff: string
	stacks: Value
	duration: Value | number
	snapshot?: Record<string, Value>
}): Effect {
	const out: any = {
		do: 'apply_buff',
		target: opts.target,
		buff: opts.buff,
		stacks: opts.stacks,
		duration: opts.duration,
	}
	if (opts.snapshot !== undefined) out.snapshot = opts.snapshot
	return out
}

/** apply a debuff to a target. duration defaults to -1 (permanent). snapshot copies Values into buff.state at apply time */
export function ApplyDebuff(opts: {
	target: Target
	debuff: string
	stacks: Value
	duration?: Value | number
	snapshot?: Record<string, Value>
}): Effect {
	const out: any = {
		do: 'apply_debuff',
		target: opts.target,
		debuff: opts.debuff,
		stacks: opts.stacks,
		duration: opts.duration ?? -1,
	}
	if (opts.snapshot !== undefined) out.snapshot = opts.snapshot
	return out
}

/** inject a modifier into the damage pipeline. only valid inside damage_intent_created listeners */
export function AddDamageModifier(opts: { kind: DamageModifierKind; value: Value }): Effect {
	return {
		do: 'add_damage_modifier',
		modifier: { kind: opts.kind, value: opts.value },
	}
}

/** atomically add to a buff state field. operates on the buff running the listener */
export function AddBuffState(opts: { key: string; value: Value }): Effect {
	return { do: 'add_buff_state', key: opts.key, value: opts.value }
}

/** set a buff state field to an exact value. operates on the buff running the listener */
export function SetBuffState(opts: { key: string; value: Value }): Effect {
	return { do: 'set_buff_state', key: opts.key, value: opts.value }
}
