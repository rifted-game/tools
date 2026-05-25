import { z } from 'zod'

import { AnimationSet } from './animation'
import { SummonTag } from './enums'
import { IntentPattern } from './intent'
import { Listener } from './listener'
import { NamespacedId, Text } from './primitives'
import { Value } from './value'

export const Summon = z
	.object({
		id: NamespacedId,
		name: Text,
		hp: Value,
		max_hp: Value,
		tags: z.array(SummonTag),
		icon: z.string().optional(),
		sfx_attack: z.string().optional(),
		sfx_death: z.string().optional(),
		animation_set: AnimationSet.optional(),
		intent_pattern: IntentPattern,
		passive_listeners: z.array(Listener).optional(),
	})
	.strict()

export type Summon = z.infer<typeof Summon>
