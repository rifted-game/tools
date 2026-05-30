import { pack } from '../internal/pack'
import type { CombatMode, ModeTag, TeamKind, WinCondition } from '../schema/enums'
import type { MatchMode as MatchModeSchema } from '../schema/match-mode'
import type { Text } from '../schema/primitives'

// --- input shapes ---------------------------------------------------------

/** a team in the object form: `teams: { red: { size: 1, kind: 'human' } }` */
export interface TeamSpec {
	/** team size — one number when min === max, or `[min, max]` for a range */
	size: number | [number, number]
	kind: TeamKind
	name?: Text
	color?: string
	startingDeck?: string[]
}

/** a team in the array form (also what the deprecated `Team()` wrapper produces) */
export interface TeamInput {
	id: string
	minSize: number
	maxSize: number
	kind: TeamKind
	name?: Text
	color?: string
	startingDeck?: string[]
}

export interface ActInSequenceInput {
	act: number
	locationPool: string[]
}

/** acts in the object form: `acts: { 1: [...], 2: [...] }` */
export type ActsInput = Record<number, string[]> | ActInSequenceInput[]

/** a win condition plus its (numeric) parameters — produced by the `win` helpers */
export interface WinSpec {
	winCondition: WinCondition
	winParams?: Record<string, number>
}

// --- deprecated wrappers --------------------------------------------------

/** @deprecated use the `teams: { id: { size, kind } }` object form instead */
export function Team(opts: TeamInput): TeamInput {
	return opts
}
/** @deprecated use the `acts: { 1: [...] }` object form instead */
export function ActInSequence(opts: ActInSequenceInput): ActInSequenceInput {
	return opts
}

/** win-condition constructors that bundle the condition with its params */
export const win = {
	/** survive until every act is cleared */
	allActs: (): WinSpec => ({ winCondition: 'all_acts_completed' }),
	/** last team with a living member wins */
	lastStanding: (): WinSpec => ({ winCondition: 'last_team_standing' }),
	/** highest score at the end wins */
	highestScore: (): WinSpec => ({ winCondition: 'highest_score' }),
	/** survive a fixed number of turns. NOTE: param key assumed `turns` — confirm vs engine */
	surviveTurns: (turns: number): WinSpec => ({
		winCondition: 'survive_n_turns',
		winParams: { turns },
	}),
	/** first team to reach the objective wins. params are mode-specific numeric values */
	firstToObjective: (params?: Record<string, number>): WinSpec => {
		const out: WinSpec = { winCondition: 'first_to_objective' }
		if (params !== undefined) out.winParams = params
		return out
	},
}

// --- normalizers ----------------------------------------------------------

function normalizeTeamSpec(id: string, t: TeamSpec): Record<string, unknown> {
	const [min, max] = Array.isArray(t.size) ? t.size : [t.size, t.size]
	const out: Record<string, unknown> = { id, min_size: min, max_size: max, kind: t.kind }
	if (t.name !== undefined) out.name = t.name
	if (t.color !== undefined) out.color = t.color
	if (t.startingDeck !== undefined) out.starting_deck = t.startingDeck
	return out
}

function normalizeTeamInput(t: TeamInput): Record<string, unknown> {
	const out: Record<string, unknown> = {
		id: t.id,
		min_size: t.minSize,
		max_size: t.maxSize,
		kind: t.kind,
	}
	if (t.name !== undefined) out.name = t.name
	if (t.color !== undefined) out.color = t.color
	if (t.startingDeck !== undefined) out.starting_deck = t.startingDeck
	return out
}

function normalizeTeams(teams: Record<string, TeamSpec> | TeamInput[]): Record<string, unknown>[] {
	if (Array.isArray(teams)) return teams.map(normalizeTeamInput)
	return Object.entries(teams).map(([id, t]) => normalizeTeamSpec(id, t))
}

function normalizeActs(acts: ActsInput): Record<string, unknown>[] {
	if (Array.isArray(acts)) {
		return acts.map(a => ({ act: a.act, location_pool: a.locationPool }))
	}
	return Object.entries(acts).map(([act, pool]) => ({ act: Number(act), location_pool: pool }))
}

export interface MatchModeOpts {
	id: string
	/** When omitted resolves to `<namespace>-mode-<name>.name` from ftl */
	name?: Text
	/** teams — object form `{ id: { size, kind } }` or an array of `Team()` results */
	teams: Record<string, TeamSpec> | TeamInput[]
	/** win condition — a bare WinCondition, or a `win.*` spec carrying its params */
	winCondition: WinCondition | WinSpec
	/** act layout — object form `{ 1: [...] }`, or an array of `ActInSequence()` results */
	acts?: ActsInput
	/** @deprecated alias for `acts` (array form) */
	actSequence?: ActInSequenceInput[]
	/** When omitted resolves to `<namespace>-mode-<name>.description` (warning if missing) */
	description?: Text
	icon?: string
	winParams?: Record<string, number>
	aiFill?: boolean
	matchmakingEligible?: boolean
	turnTimeLimitSeconds?: number
	modeTagsVisible?: ModeTag[]
	/** combat model: 'sequential' (PvE, default) or 'blind_commit' (PvP arena) */
	combatMode?: CombatMode
}

const matchModeRenames = {
	aiFill: 'ai_fill',
	matchmakingEligible: 'matchmaking_eligible',
	turnTimeLimitSeconds: 'turn_time_limit_seconds',
	modeTagsVisible: 'mode_tags_visible',
	combatMode: 'combat_mode',
} as const

/** define a match mode */
export function MatchMode(opts: MatchModeOpts): MatchModeSchema {
	const actsInput = opts.acts ?? opts.actSequence
	if (actsInput === undefined) throw new Error('MatchMode requires `acts` (or `actSequence`)')

	const isWinSpec = typeof opts.winCondition === 'object'
	const winCondition = isWinSpec
		? (opts.winCondition as WinSpec).winCondition
		: (opts.winCondition as WinCondition)
	const winParams = isWinSpec ? (opts.winCondition as WinSpec).winParams : opts.winParams

	return pack(
		{
			id: opts.id,
			teams: normalizeTeams(opts.teams),
			win_condition: winCondition,
			act_sequence: normalizeActs(actsInput),
		},
		{
			name: opts.name,
			description: opts.description,
			icon: opts.icon,
			win_params: winParams,
			aiFill: opts.aiFill,
			matchmakingEligible: opts.matchmakingEligible,
			turnTimeLimitSeconds: opts.turnTimeLimitSeconds,
			modeTagsVisible: opts.modeTagsVisible,
			combatMode: opts.combatMode,
		},
		matchModeRenames,
	) as unknown as MatchModeSchema
}
