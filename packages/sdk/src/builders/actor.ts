import type { Actor as ActorSchema } from '../schema/actor'
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
	const out: any = { id: opts.id }
	if (opts.name !== undefined) out.name = opts.name
	if (opts.position !== undefined) out.position = opts.position
	if (opts.portrait !== undefined) out.portrait = opts.portrait
	if (opts.animationSet !== undefined) out.animation_set = opts.animationSet
	return out
}
