import type { z } from 'zod'

import type { Actor as ActorSchema, Actor as ActorZod } from '../schema/actor'
import type { ActorPosition } from '../schema/actor-position'
import type { AnimationSet } from '../schema/animation'
import type { Text } from '../schema/primitives'

/** actor on the encounter stage. id is local to the encounter */
export function Actor(opts: {
	id: string
	name?: Text
	position?: ActorPosition
	portrait?: string
	animationSet?: AnimationSet
}): ActorSchema {
	// satisfies validates the snake_cased shape against the schema input statically
	return {
		id: opts.id,
		...(opts.name !== undefined && { name: opts.name }),
		...(opts.position !== undefined && { position: opts.position }),
		...(opts.portrait !== undefined && { portrait: opts.portrait }),
		...(opts.animationSet !== undefined && { animation_set: opts.animationSet }),
	} satisfies z.input<typeof ActorZod> as ActorSchema
}
