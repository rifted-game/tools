import { z } from 'zod'

import { Condition } from './condition'
import { Effect } from './effect'
import { IntentKind } from './enums'
import { Text } from './primitives'
import { Value } from './value'

export const Intent = z
	.object({
		kind: IntentKind,
		amount: Value.optional(),
		description: Text,
		on_execute: Effect.optional(),
	})
	.strict()

export type Intent = z.infer<typeof Intent>

export const ConditionalIntent = z
	.object({
		condition: Condition,
		kind: IntentKind,
		amount: Value.optional(),
		description: Text,
		on_execute: Effect.optional(),
	})
	.strict()

export type ConditionalIntent = z.infer<typeof ConditionalIntent>

export const IntentPattern = z.union([
	z.object({ kind: z.literal('sequence'), intents: z.array(Intent).min(1) }).strict(),
	z
		.object({
			kind: z.literal('conditional'),
			intents: z.array(ConditionalIntent).min(1),
		})
		.strict(),
])

export type IntentPattern = z.infer<typeof IntentPattern>
