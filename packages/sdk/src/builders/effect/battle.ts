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

/** apply a buff to a target. duration of -1 means permanent */
export function ApplyBuff(opts: {
	target: Target
	buff: string
	stacks: Value
	duration: Value | number
}): Effect {
	return {
		do: 'apply_buff',
		target: opts.target,
		buff: opts.buff,
		stacks: opts.stacks,
		duration: opts.duration,
	}
}

/** apply a debuff to a target. duration defaults to -1 (permanent) */
export function ApplyDebuff(opts: {
	target: Target
	debuff: string
	stacks: Value
	duration?: Value | number
}): Effect {
	return {
		do: 'apply_debuff',
		target: opts.target,
		debuff: opts.debuff,
		stacks: opts.stacks,
		duration: opts.duration ?? -1,
	}
}

/** inject a modifier into the damage pipeline. only valid inside damage_intent_created listeners */
export function AddDamageModifier(opts: { kind: DamageModifierKind; value: Value }): Effect {
	return {
		do: 'add_damage_modifier',
		modifier: { kind: opts.kind, value: opts.value },
	}
}
