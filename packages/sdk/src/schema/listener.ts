import { z } from 'zod'

import { Condition } from './condition'
import { Effect } from './effect'

// listener subscribes to an event. fires effect while the owning entity is active
export const Listener = z
	.object({
		on_event: z.string().min(1),
		when: Condition.optional(),
		effect: Effect,
	})
	.strict()

export type Listener = z.infer<typeof Listener>
