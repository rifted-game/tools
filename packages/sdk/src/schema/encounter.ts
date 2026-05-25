import { z } from 'zod'

import { Actor } from './actor'
import { Choice } from './choice'
import { Condition } from './condition'
import { Effect } from './effect'
import { screenSpec } from './effect/screen'
import { ModeTag } from './enums'
import { Listener } from './listener'
import { NamespacedId, Text } from './primitives'
import { StateInit } from './state'

export const Encounter = z
	.object({
		id: NamespacedId,
		title: Text.optional(),
		body: Text.optional(),
		icon: z.string().optional(),
		background: z.string().optional(),
		condition: Condition.optional(),
		weight: z.number().int().min(1).optional().default(1),
		triggered_once_per_run: z.boolean().optional().default(false),
		mode_tags: z.array(ModeTag).optional(),
		actors: z.array(Actor).max(4).optional(),
		initial_state: z.record(z.string(), StateInit).optional(),
		intro: z.array(Effect).optional(),
		screen: screenSpec.optional(),
		choices: z.array(Choice).min(1).optional(),
		outro: z.array(Effect).optional(),
		passive_listeners: z.array(Listener).optional(),
	})
	.strict()

export type Encounter = z.infer<typeof Encounter>
