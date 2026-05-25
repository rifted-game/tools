import { z } from 'zod'

import { Affinity, ModeTag } from './enums'
import { Listener } from './listener'
import { HexColor, NamespacedId, Text } from './primitives'

export const Relic = z
	.object({
		id: NamespacedId,
		name: Text,
		description: Text,
		icon: z.string().min(1),
		color: HexColor,
		affinity_hint: Affinity,
		mode_tags: z.array(ModeTag).optional(),
		passive_listeners: z.array(Listener).min(1),
	})
	.strict()

export type Relic = z.infer<typeof Relic>
