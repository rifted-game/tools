import { z } from 'zod'

import { NamespacedId } from '../primitives'
import { Value } from '../value'

const Duration = z.union([z.number().int().min(-1), Value])

export const summonEnemyEffect = z
	.object({
		do: z.literal('summon_enemy'),
		id: NamespacedId,
		count: Value.optional(),
	})
	.strict()

export const summonAllyEffect = z
	.object({
		do: z.literal('summon_ally'),
		id: NamespacedId,
		duration: Duration.optional(),
	})
	.strict()

export const summonEffects = [summonEnemyEffect, summonAllyEffect] as const
