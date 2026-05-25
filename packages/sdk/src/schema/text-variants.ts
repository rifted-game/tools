import { z } from 'zod'

import { Condition } from './condition'
import { Text } from './primitives'

// dialogue text dsl. three shapes:
// - plain text (any form accepted by Text)
// - { variants: [...] } picks first entry where condition passes
// - { random: [...] } picks uniformly from the pool
export type TextWithVariants =
	| z.infer<typeof Text>
	| {
			variants: Array<{
				condition?: z.infer<typeof Condition>
				text: TextWithVariants
			}>
	  }
	| { random: TextWithVariants[] }

const lazy: z.ZodType<TextWithVariants> = z.lazy(() => TextWithVariants)

export const TextWithVariants: z.ZodType<TextWithVariants> = z.union([
	Text,
	z
		.object({
			variants: z.array(z.object({ condition: Condition.optional(), text: lazy }).strict()).min(1),
		})
		.strict(),
	z.object({ random: z.array(lazy).min(1) }).strict(),
])
