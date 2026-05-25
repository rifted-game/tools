import { z } from 'zod'

import { BuiltinEvent } from './enums'

const StateDecay = z
	.object({
		on_event: z.union([BuiltinEvent, z.string().min(1)]),
		amount: z.number().positive(),
		min: z.number().optional().default(0),
	})
	.strict()

// state initializer: fixed value or a random int rolled once on entity creation
export const StateInit = z.union([
	z
		.object({
			const: z.number(),
			decay: StateDecay.optional(),
		})
		.strict(),
	z
		.object({
			random_int: z.object({ min: z.number().int(), max: z.number().int() }).strict(),
			decay: StateDecay.optional(),
		})
		.strict(),
])

export type StateInit = z.infer<typeof StateInit>
