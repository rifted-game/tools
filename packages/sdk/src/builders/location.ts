import { pack } from '../internal/pack'
import type { NodeKind } from '../schema/enums'
import type { Location as LocationSchema } from '../schema/location'
import type { Text } from '../schema/primitives'

// --- input shapes (camelCase, with shorthand) -----------------------------

export interface SpawnEntryInput {
	id: string
	weight: number
	minFloor?: number
	maxFloor?: number
}

export interface SpawnTableInput {
	combat?: SpawnEntryInput[]
	elite?: SpawnEntryInput[]
	boss?: string
	pvpMap?: string
}

export interface GuaranteedNodeInput {
	floor: number
	kind: NodeKind
	icon?: string
}

export interface MapConfigInput {
	floors: number
	width: number
	/** `[min, max]` path count — shorthand for pathsMin/pathsMax */
	paths?: [number, number]
	pathsMin?: number
	pathsMax?: number
	subgraphSymmetry?: 'symmetric' | 'asymmetric'
	nodeWeights?: Record<string, number>
	/** floor → guaranteed node kind, e.g. `{ 6: 'shop', 12: 'boss' }` */
	guaranteed?: Record<number, NodeKind>
	guaranteedNodes?: GuaranteedNodeInput[]
	/** pairwise tether config — `{ chance, max? }` */
	tethers?: { chance: number; max?: number }
	pairwiseTetherChance?: number
	maxPairwiseTethersPerFloor?: number
}

export interface BackgroundLayerInput {
	asset: string
	scrollRate?: number
	tint?: string
}

export interface FloorVisualInput {
	floors: number[]
	layers: BackgroundLayerInput[]
	music?: string
	ambient?: string
}

// --- deprecated wrappers (identity passthroughs) --------------------------
// Kept for back-compat. Prefer passing plain objects to Location directly.

/** @deprecated pass a plain object to `Location.map` instead */
export function MapConfig(opts: MapConfigInput): MapConfigInput {
	return opts
}
/** @deprecated pass a plain object to `FloorVisual` entries instead */
export function FloorVisual(opts: FloorVisualInput): FloorVisualInput {
	return opts
}
/** @deprecated inline the layer object instead */
export function BackgroundLayer(opts: BackgroundLayerInput): BackgroundLayerInput {
	return opts
}
/** @deprecated pass a plain object to `Location.spawnTable` instead */
export function SpawnTable(opts: SpawnTableInput): SpawnTableInput {
	return opts
}
/** @deprecated inline the spawn entry object instead */
export function SpawnEntry(opts: SpawnEntryInput): SpawnEntryInput {
	return opts
}
/** @deprecated use the `guaranteed: { floor: kind }` shorthand instead */
export function GuaranteedNode(opts: GuaranteedNodeInput): GuaranteedNodeInput {
	return opts
}

// --- normalizers (camelCase + shorthand → snake_case json) ----------------

function normalizeGuaranteed(g: GuaranteedNodeInput): Record<string, unknown> {
	const out: Record<string, unknown> = { floor: g.floor, kind: g.kind }
	if (g.icon !== undefined) out.icon = g.icon
	return out
}

function normalizeMap(m: MapConfigInput): Record<string, unknown> {
	const out: Record<string, unknown> = { floors: m.floors, width: m.width }
	const pathsMin = m.paths?.[0] ?? m.pathsMin
	const pathsMax = m.paths?.[1] ?? m.pathsMax
	if (pathsMin !== undefined) out.paths_min = pathsMin
	if (pathsMax !== undefined) out.paths_max = pathsMax
	if (m.subgraphSymmetry !== undefined) out.subgraph_symmetry = m.subgraphSymmetry
	if (m.nodeWeights !== undefined) out.node_weights = m.nodeWeights
	const guaranteed = m.guaranteed
		? Object.entries(m.guaranteed).map(([floor, kind]) => ({ floor: Number(floor), kind }))
		: m.guaranteedNodes
	if (guaranteed !== undefined) out.guaranteed_nodes = guaranteed.map(normalizeGuaranteed)
	const tetherChance = m.tethers?.chance ?? m.pairwiseTetherChance
	const tetherMax = m.tethers?.max ?? m.maxPairwiseTethersPerFloor
	if (tetherChance !== undefined) out.pairwise_tether_chance = tetherChance
	if (tetherMax !== undefined) out.max_pairwise_tethers_per_floor = tetherMax
	return out
}

function normalizeLayer(l: BackgroundLayerInput): Record<string, unknown> {
	const out: Record<string, unknown> = { asset: l.asset }
	if (l.scrollRate !== undefined) out.scroll_rate = l.scrollRate
	if (l.tint !== undefined) out.tint = l.tint
	return out
}

function normalizeVisual(v: FloorVisualInput): Record<string, unknown> {
	const out: Record<string, unknown> = { floors: v.floors, layers: v.layers.map(normalizeLayer) }
	if (v.music !== undefined) out.music = v.music
	if (v.ambient !== undefined) out.ambient = v.ambient
	return out
}

function normalizeSpawnEntry(e: SpawnEntryInput): Record<string, unknown> {
	const out: Record<string, unknown> = { id: e.id, weight: e.weight }
	if (e.minFloor !== undefined) out.min_floor = e.minFloor
	if (e.maxFloor !== undefined) out.max_floor = e.maxFloor
	return out
}

function normalizeSpawnTable(t: SpawnTableInput): Record<string, unknown> {
	const out: Record<string, unknown> = {}
	if (t.combat !== undefined) out.combat = t.combat.map(normalizeSpawnEntry)
	if (t.elite !== undefined) out.elite = t.elite.map(normalizeSpawnEntry)
	if (t.boss !== undefined) out.boss = t.boss
	if (t.pvpMap !== undefined) out.pvp_map = t.pvpMap
	return out
}

export interface LocationOpts {
	id: string
	/** When omitted resolves to `<namespace>-location-<name>` from ftl */
	name?: Text
	act: number
	map: MapConfigInput
	visuals: FloorVisualInput[]
	spawnTable: SpawnTableInput
	defaultMusic?: string
	defaultAmbient?: string
	nodeIcons?: Record<string, string>
	encounterTable?: Array<{ id: string; weightOverride?: number }>
	lootBias?: { commonDelta?: number; rareDelta?: number; legendaryDelta?: number }
}

/** define a location. one act may have multiple; the engine picks one per run */
export function Location(opts: LocationOpts): LocationSchema {
	const et = opts.encounterTable?.map(e =>
		e.weightOverride === undefined ? { id: e.id } : { id: e.id, weight_override: e.weightOverride },
	)
	const lb =
		opts.lootBias === undefined
			? undefined
			: {
					...(opts.lootBias.commonDelta !== undefined && {
						common_delta: opts.lootBias.commonDelta,
					}),
					...(opts.lootBias.rareDelta !== undefined && { rare_delta: opts.lootBias.rareDelta }),
					...(opts.lootBias.legendaryDelta !== undefined && {
						legendary_delta: opts.lootBias.legendaryDelta,
					}),
				}
	return pack(
		{
			id: opts.id,
			act: opts.act,
			map: normalizeMap(opts.map),
			visuals: opts.visuals.map(normalizeVisual),
			spawn_table: normalizeSpawnTable(opts.spawnTable),
		},
		{
			name: opts.name,
			default_music: opts.defaultMusic,
			default_ambient: opts.defaultAmbient,
			node_icons: opts.nodeIcons,
			encounter_table: et,
			loot_bias: lb,
		},
	) as unknown as LocationSchema
}
