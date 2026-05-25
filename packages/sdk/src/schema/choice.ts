import { z } from 'zod'

import { Condition } from './condition'
import { Effect } from './effect'
import { Text } from './primitives'

export const Choice = z
	.object({
		label: Text,
		condition: Condition.optional(),
		hide_if_disabled: z.boolean().optional().default(false),
		on_select: Effect.optional(),
		effect: Effect.optional(),
	})
	.strict()

export type Choice = z.infer<typeof Choice>
