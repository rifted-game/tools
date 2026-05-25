import { z } from 'zod'

import { ModeTag, TeamKind, WinCondition } from './enums'
import { BareId, HexColor, NamespacedId, Text } from './primitives'

const Team = z
	.object({
		id: BareId,
		name: Text.optional(),
		min_size: z.number().int().min(1),
		max_size: z.number().int().min(1),
		kind: TeamKind,
		color: HexColor.optional(),
	})
	.strict()

const ActInSequence = z
	.object({
		act: z.number().int().min(1).max(10),
		location_pool: z.array(NamespacedId).min(1),
	})
	.strict()

export const MatchMode = z
	.object({
		id: NamespacedId,
		name: Text.optional(),
		description: Text.optional(),
		icon: z.string().optional(),
		teams: z.array(Team).min(1).max(8),
		win_condition: WinCondition,
		win_params: z.record(z.string(), z.unknown()).optional(),
		act_sequence: z.array(ActInSequence).min(1),
		ai_fill: z.boolean().optional().default(false),
		matchmaking_eligible: z.boolean().optional().default(false),
		turn_time_limit_seconds: z.number().int().min(0).optional(),
		mode_tags_visible: z.array(ModeTag).optional(),
	})
	.strict()

export type MatchMode = z.infer<typeof MatchMode>
