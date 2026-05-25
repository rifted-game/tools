import { z } from 'zod'

import { DamageModifierKind, Target } from '../enums'
import { Value } from '../value'

const Duration = z.union([z.number().int().min(-1), Value])
const BareBuffId = z.string().regex(/^[a-z][a-z0-9_]*$/)

export const damageEffect = z
	.object({ do: z.literal('damage'), target: Target, amount: Value })
	.strict()

export const gainBlockEffect = z
	.object({
		do: z.literal('gain_block'),
		target: Target.optional(),
		amount: Value,
	})
	.strict()

export const selfDamageEffect = z.object({ do: z.literal('self_damage'), amount: Value }).strict()

export const applyBuffEffect = z
	.object({
		do: z.literal('apply_buff'),
		target: Target,
		buff: BareBuffId,
		stacks: Value,
		duration: Duration,
	})
	.strict()

export const applyDebuffEffect = z
	.object({
		do: z.literal('apply_debuff'),
		target: Target,
		debuff: BareBuffId,
		stacks: Value,
		duration: Duration.optional().default(-1),
	})
	.strict()

export const addDamageModifierEffect = z
	.object({
		do: z.literal('add_damage_modifier'),
		modifier: z.object({ kind: DamageModifierKind, value: Value }).strict(),
	})
	.strict()

export const battleEffects = [
	damageEffect,
	gainBlockEffect,
	selfDamageEffect,
	applyBuffEffect,
	applyDebuffEffect,
	addDamageModifierEffect,
] as const
