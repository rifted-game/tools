import { pack } from '../internal/pack'
import type { NodeKind } from '../schema/enums'
import type { Location as LocationSchema } from '../schema/location'
import type { Text } from '../schema/primitives'

export function SpawnEntry(opts: {
	id: string
	weight: number
	minFloor?: number
	maxFloor?: number
}) {
	const out: any = { id: opts.id, weight: opts.weight }
	if (opts.minFloor !== undefined) out.min_floor = opts.minFloor
	if (opts.maxFloor !== undefined) out.max_floor = opts.maxFloor
	return out
}

export function SpawnTable(opts: {
	combat?: ReturnType<typeof SpawnEntry>[]
	elite?: ReturnType<typeof SpawnEntry>[]
	boss?: string
	pvpMap?: string
}) {
	const out: any = {}
	if (opts.combat !== undefined) out.combat = opts.combat
	if (opts.elite !== undefined) out.elite = opts.elite
	if (opts.boss !== undefined) out.boss = opts.boss
	if (opts.pvpMap !== undefined) out.pvp_map = opts.pvpMap
	return out
}

export function GuaranteedNode(opts: { floor: number; kind: NodeKind; icon?: string }) {
	const out: any = { floor: opts.floor, kind: opts.kind }
	if (opts.icon !== undefined) out.icon = opts.icon
	return out
}

export function MapConfig(opts: {
	floors: number
	width: number
	pathsMin?: number
	pathsMax?: number
	subgraphSymmetry?: 'symmetric' | 'asymmetric'
	nodeWeights?: Record<string, number>
	guaranteedNodes?: ReturnType<typeof GuaranteedNode>[]
	pairwiseTetherChance?: number
	maxPairwiseTethersPerFloor?: number
}) {
	return pack(
		{ floors: opts.floors, width: opts.width },
		{
			paths_min: opts.pathsMin,
			paths_max: opts.pathsMax,
			subgraph_symmetry: opts.subgraphSymmetry,
			node_weights: opts.nodeWeights,
			guaranteed_nodes: opts.guaranteedNodes,
			pairwise_tether_chance: opts.pairwiseTetherChance,
			max_pairwise_tethers_per_floor: opts.maxPairwiseTethersPerFloor,
		},
	)
}

export function BackgroundLayer(opts: { asset: string; scrollRate?: number; tint?: string }) {
	const out: any = { asset: opts.asset }
	if (opts.scrollRate !== undefined) out.scroll_rate = opts.scrollRate
	if (opts.tint !== undefined) out.tint = opts.tint
	return out
}

export function FloorVisual(opts: {
	floors: number[]
	layers: ReturnType<typeof BackgroundLayer>[]
	music?: string
	ambient?: string
}) {
	const out: any = { floors: opts.floors, layers: opts.layers }
	if (opts.music !== undefined) out.music = opts.music
	if (opts.ambient !== undefined) out.ambient = opts.ambient
	return out
}

export interface LocationOpts {
	id: string
	name: Text
	act: number
	map: ReturnType<typeof MapConfig>
	visuals: ReturnType<typeof FloorVisual>[]
	spawnTable: ReturnType<typeof SpawnTable>
	defaultMusic?: string
	defaultAmbient?: string
	nodeIcons?: Record<string, string>
	encounterTable?: Array<{ id: string; weightOverride?: number }>
	lootBias?: {
		commonDelta?: number
		rareDelta?: number
		legendaryDelta?: number
	}
}

/** define a location. one act may have multiple locations — engine picks one per run */
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
					...(opts.lootBias.rareDelta !== undefined && {
						rare_delta: opts.lootBias.rareDelta,
					}),
					...(opts.lootBias.legendaryDelta !== undefined && {
						legendary_delta: opts.lootBias.legendaryDelta,
					}),
				}
	return pack(
		{
			id: opts.id,
			name: opts.name,
			act: opts.act,
			map: opts.map,
			visuals: opts.visuals,
			spawn_table: opts.spawnTable,
		},
		{
			default_music: opts.defaultMusic,
			default_ambient: opts.defaultAmbient,
			node_icons: opts.nodeIcons,
			encounter_table: et,
			loot_bias: lb,
		},
	) as unknown as LocationSchema
}
