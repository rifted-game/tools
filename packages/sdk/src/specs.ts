// Definition specs and slot contexts — the shapes authors fill in. Pure
// types: the runtime that consumes them lives in ./content (the composer)
// and ./pkg (the package).

import type { Cap, Cond, ExprLike } from './core/expr'
import type {
	BattlePaths,
	CardPaths,
	CardStateEntries,
	EventExprs,
	ModPaths,
	ParamExprs,
	Params,
	PlayerPaths,
	SelfPaths,
	UnitPaths,
} from './core/paths'
import type { RefLike } from './core/refs'
import type { EventSpec, HookDef, HookScope, PayloadOf } from './hooks'
import type { PhaseDef } from './intent'
import type { LocText } from './locales/index'

export type ScaleType = 'flat' | 'linear' | 'exp' | 'hyp'

export type RenderBindings = Record<string, ExprLike<Cap>>

// --- slot contexts ---

export interface CardRenderCtx<P extends Params, S extends Params> {
	readonly params: ParamExprs<P>
	readonly state: CardStateEntries<S>
	readonly card: CardPaths<P, S>
}

export interface CardPlayCtx<P extends Params, S extends Params> {
	readonly params: ParamExprs<P>
	readonly state: CardStateEntries<S>
	readonly card: CardPaths<P, S>
	readonly self: SelfPaths
	readonly target: UnitPaths
	readonly battle: BattlePaths
	readonly player: PlayerPaths
	/**
	 * defer the card: it leaves the deck, a quest watcher lands on the player;
	 * finish() inside do returns the card to the deck (stacks merge)
	 */
	deferCard<E extends EventSpec>(spec: DeferSpec<P, S, E>): void
	/** reveal watcher: the card stays in the deck, accumulating a threshold */
	revealAfter(spec: RevealSpec): void
}

export interface WatcherCtx<
	E extends EventSpec,
	P extends Params = Params,
	S extends Params = Params,
> {
	readonly event: EventExprs<PayloadOf<E>>
	/** the bound card (card watchers; bare watchers read 0 here) */
	readonly card: CardPaths<P, S>
	readonly player: PlayerPaths
	readonly battle: BattlePaths
	readonly self: SelfPaths
	readonly target: UnitPaths
}

export interface WatcherRenderCtx<P extends Params = Params, S extends Params = Params> {
	readonly card: CardPaths<P, S>
	readonly player: PlayerPaths
}

export interface ModifierRenderCtx<MP extends Params> {
	readonly mod: ModPaths<MP>
	readonly card: CardPaths
}

export interface AffinityRenderCtx {
	readonly player: PlayerPaths
}

// --- card-bound watchers ---

export interface DeferSpec<P extends Params, S extends Params, E extends EventSpec> {
	/** watcher id in gcf — required when visible (it lands in fluent keys) */
	id?: string
	/** quest title/description for the UI (visible quests) */
	name?: LocText
	description?: LocText
	on: E
	scope?: HookScope
	when?: Cond<Cap> | ((ctx: WatcherCtx<E, P, S>) => Cond<Cap>)
	team?: boolean
	visible?: boolean
	render?: (ctx: WatcherRenderCtx<P, S>) => RenderBindings
	do(ctx: WatcherCtx<E, P, S>): void
}

export interface RevealSpec {
	id?: string
	on: EventSpec
	/** payload field accumulated toward the threshold */
	field: string
	threshold: number
}

// --- definition specs ---

export interface CardSpec<P extends Params = Params, S extends Params = Params> {
	name?: LocText
	description?: LocText
	cooldown?: number
	scale?: ScaleType
	tags?: string[]
	affinity?: RefLike<'affinity'>
	/** craft seal card: craft + as_modifier in one field */
	seal?: RefLike<'modifier'>
	craft?: boolean
	asModifier?: RefLike<'modifier'>
	params?: P
	/** run-scoped card state declaration — typing only, not emitted to GCF */
	state?: S
	art?: Record<string, string>
	render?: (ctx: CardRenderCtx<P, S>) => RenderBindings
	onPlay?: (ctx: CardPlayCtx<P, S>) => void
	hooks?: HookDef[]
}

export interface ModifierSpec<MP extends Params = Params> {
	name?: LocText
	description?: LocText
	/** spectral gate: a player modifier only hears cards with all these tags */
	tags?: string[]
	duration?: number
	decay?: boolean
	cooldownDelta?: number
	/** card tags that cannot be played while the modifier is on */
	blocks?: string[]
	params?: MP
	art?: Record<string, string>
	render?: (ctx: ModifierRenderCtx<MP>) => RenderBindings
	hooks?: HookDef[]
}

export interface EnemySpec {
	name?: LocText
	description?: LocText
	hp: number
	hooks?: HookDef[]
	phases?: PhaseDef[]
	art?: Record<string, string>
}

export interface WatcherSpec<E extends EventSpec> {
	name?: LocText
	description?: LocText
	on: E
	scope?: HookScope
	when?: Cond<Cap> | ((ctx: WatcherCtx<E>) => Cond<Cap>)
	team?: boolean
	visible?: boolean
	render?: (ctx: WatcherRenderCtx) => RenderBindings
	do(ctx: WatcherCtx<E>): void
}

export interface LootSpec {
	pool: RefLike<'card'>[]
	offer: number
	picks: number
}

export interface EncounterSpec {
	name?: LocText
	description?: LocText
	enemies: RefLike<'enemy'>[]
	loot?: LootSpec
}

export type NodeKindName =
	| 'combat'
	| 'elite'
	| 'shop'
	| 'altar'
	| 'anomaly'
	| 'encounter'
	| 'swap'
	| 'boss'
	| 'arena'
	| 'rest'

export interface KindRuleSpec {
	weight?: number
	minFloor?: number
	maxFloor?: number
	noAdjacent?: boolean
	noConsecutive?: boolean
}

export interface TetherSpec {
	/** pairwise tethers (swap tables) between adjacent lanes */
	pairwise?: { chance?: number; min?: number; minFloor?: number; maxFloor?: number }
	/** anchor tether on the bosses: the scene it opens */
	anchor?: 'boss' | 'arena' | 'swap' | (string & {})
}

export interface MapSpec {
	name?: LocText
	description?: LocText
	floors: number
	width: number
	paths: number
	fanout?: number
	rules?: Partial<Record<NodeKindName, KindRuleSpec>>
	/** forced floor kind; a negative key counts from the end (-1 = pre-boss) */
	forceFloors?: Record<number, NodeKindName>
	content?: Partial<Record<NodeKindName, RefLike<'encounter'>[]>>
	tethers?: TetherSpec
}

export interface AffinitySpec {
	name?: LocText
	description?: LocText
	params?: Params
	art?: Record<string, string>
	render?: (ctx: AffinityRenderCtx) => RenderBindings
}
