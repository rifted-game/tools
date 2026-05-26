import { z } from 'zod'

import { Affinity, BuffKind, EngineFlag } from './enums'
import { Listener } from './listener'
import { BareId, HexColor, Text } from './primitives'

// buff initial_state uses the same const/random_int shape as cards but without decay
const BuffStateInit = z.union([
	z.object({ const: z.number() }).strict(),
	z
		.object({
			random_int: z.object({ min: z.number().int(), max: z.number().int() }).strict(),
		})
		.strict(),
])

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
		params: z.record(z.string(), z.number()).optional(),
		initial_state: z.record(z.string(), BuffStateInit).optional(),
		passive_listeners: z.array(Listener).optional(),
	})
	.strict()

export type Buff = z.infer<typeof Buff>
