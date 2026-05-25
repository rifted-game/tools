import { z } from 'zod'

import { Condition } from './condition'
import { Effect } from './effect'
import { IntentPattern } from './intent'
import { Listener } from './listener'
import { BareId } from './primitives'

export const Phase = z
	.object({
		id: BareId,
		transition_condition: Condition.optional(),
		transition_event: BareId.optional(),
		on_enter: Effect.optional(),
		intent_pattern: IntentPattern,
		passive_listeners: z.array(Listener).optional(),
	})
	.strict()

export type Phase = z.infer<typeof Phase>
