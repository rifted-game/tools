import { z } from 'zod'

import { Affinity, BuffKind, EngineFlag } from './enums'
import { Listener } from './listener'
import { BareId, HexColor, Text } from './primitives'

export const Buff = z
	.object({
		id: BareId,
		name: Text.optional(),
		description: Text.optional(),
		icon: z.string().min(1),
		color: HexColor,
		show_stacks: z.boolean(),
		show_duration: z.boolean(),
		kind: BuffKind,
		warn_player: z.boolean().optional().default(false),
		affinity_hint: Affinity.optional(),
		engine_flags: z.array(EngineFlag).optional(),
		passive_listeners: z.array(Listener).optional(),
	})
	.strict()

export type Buff = z.infer<typeof Buff>
