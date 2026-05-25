import { z } from 'zod'

import { ActorPosition } from './actor-position'
import { AnimationSet } from './animation'
import { BareId, Text } from './primitives'

export const Actor = z
	.object({
		id: BareId,
		name: Text.optional(),
		position: ActorPosition.optional(),
		portrait: z.string().optional(),
		animation_set: AnimationSet.optional(),
	})
	.strict()

export type Actor = z.infer<typeof Actor>
