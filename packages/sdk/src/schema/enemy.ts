import { z } from 'zod'

import { AnimationSet } from './animation'
import { EnemyTag } from './enums'
import { IntentPattern } from './intent'
import { Listener } from './listener'
import { Phase } from './phase'
import { NamespacedId, Text } from './primitives'
import { Value } from './value'

export const Enemy = z
	.object({
		id: NamespacedId,
		name: Text.optional(),
		hp: Value,
		max_hp: Value,
		tags: z.array(EnemyTag),
		icon: z.string().optional(),
		sfx_attack: z.string().optional(),
		sfx_death: z.string().optional(),
		animation_set: AnimationSet.optional(),
		intent_pattern: IntentPattern.optional(),
		passive_listeners: z.array(Listener).optional(),
		phases: z.array(Phase).min(2).optional(),
	})
	.strict()
	.refine(
		e => {
			const hasPattern = e.intent_pattern !== undefined
			const hasPhases = e.phases !== undefined
			return hasPattern !== hasPhases
		},
		{ message: 'enemy must declare exactly one of intent_pattern or phases' },
	)

export type Enemy = z.infer<typeof Enemy>
