import { z } from 'zod'

const Anchor = z.enum(['left', 'center', 'right', 'center_back', 'far_left', 'far_right'])

// position of an actor on the encounter stage.
// three shapes: named anchor, anchor + pixel offset, raw xy
export const ActorPosition = z.union([
	Anchor,
	z
		.object({
			anchor: Anchor,
			offset: z.tuple([z.number().int(), z.number().int()]),
		})
		.strict(),
	z.object({ x: z.number().int(), y: z.number().int() }).strict(),
])

export type ActorPosition = z.infer<typeof ActorPosition>
export type { Anchor }
