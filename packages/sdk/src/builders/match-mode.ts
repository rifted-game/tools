import { pack } from '../internal/pack'
import type { ModeTag, TeamKind, WinCondition } from '../schema/enums'
import type { MatchMode as MatchModeSchema } from '../schema/match-mode'
import type { Text } from '../schema/primitives'

export function Team(opts: {
	id: string
	minSize: number
	maxSize: number
	kind: TeamKind
	name?: Text
	color?: string
}) {
	const out: any = { id: opts.id, min_size: opts.minSize, max_size: opts.maxSize, kind: opts.kind }
	if (opts.name !== undefined) out.name = opts.name
	if (opts.color !== undefined) out.color = opts.color
	return out
}

export function ActInSequence(opts: { act: number; locationPool: string[] }) {
	return { act: opts.act, location_pool: opts.locationPool }
}

export interface MatchModeOpts {
	id: string
	/** When omitted resolves to `<namespace>-mode-<name>.name` from ftl */
	name?: Text
	teams: ReturnType<typeof Team>[]
	winCondition: WinCondition
	actSequence: ReturnType<typeof ActInSequence>[]
	/** When omitted resolves to `<namespace>-mode-<name>.description` (warning if missing) */
	description?: Text
	icon?: string
	winParams?: Record<string, unknown>
	aiFill?: boolean
	matchmakingEligible?: boolean
	turnTimeLimitSeconds?: number
	modeTagsVisible?: ModeTag[]
}

const matchModeRenames = {
	winCondition: 'win_condition',
	winParams: 'win_params',
	actSequence: 'act_sequence',
	aiFill: 'ai_fill',
	matchmakingEligible: 'matchmaking_eligible',
	turnTimeLimitSeconds: 'turn_time_limit_seconds',
	modeTagsVisible: 'mode_tags_visible',
}

/** define a match mode */
export function MatchMode(opts: MatchModeOpts): MatchModeSchema {
	return pack(
		{
			id: opts.id,
			teams: opts.teams,
			win_condition: opts.winCondition,
			act_sequence: opts.actSequence,
		},
		{
			name: opts.name,
			description: opts.description,
			icon: opts.icon,
			winParams: opts.winParams,
			aiFill: opts.aiFill,
			matchmakingEligible: opts.matchmakingEligible,
			turnTimeLimitSeconds: opts.turnTimeLimitSeconds,
			modeTagsVisible: opts.modeTagsVisible,
		},
		matchModeRenames,
	) as unknown as MatchModeSchema
}
