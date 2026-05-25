import { z } from 'zod'

import { NodeKind } from './enums'
import { HexColor, NamespacedId, Text } from './primitives'

const SpawnEntry = z
	.object({
		id: NamespacedId,
		weight: z.number().int().min(1),
		min_floor: z.number().int().min(1).optional(),
		max_floor: z.number().int().min(1).optional(),
	})
	.strict()

const SpawnTable = z
	.object({
		combat: z.array(SpawnEntry).min(1).optional(),
		elite: z.array(SpawnEntry).min(1).optional(),
		boss: NamespacedId.optional(),
		pvp_map: NamespacedId.optional(),
	})
	.strict()

const GuaranteedNode = z
	.object({
		floor: z.number().int().min(1),
		kind: NodeKind,
		icon: z.string().optional(),
	})
	.strict()

const NodeWeights = z
	.object({
		combat: z.number().int().min(0).optional(),
		elite: z.number().int().min(0).optional(),
		shop: z.number().int().min(0).optional(),
		altar: z.number().int().min(0).optional(),
		anomaly: z.number().int().min(0).optional(),
		encounter: z.number().int().min(0).optional(),
	})
	.strict()

const MapConfig = z
	.object({
		floors: z.number().int().min(2).max(20),
		width: z.number().int().min(1).max(6),
		paths_min: z.number().int().min(1).optional().default(2),
		paths_max: z.number().int().min(1).optional().default(4),
		subgraph_symmetry: z.enum(['symmetric', 'asymmetric']).optional().default('symmetric'),
		node_weights: NodeWeights.optional(),
		guaranteed_nodes: z.array(GuaranteedNode).optional(),
		pairwise_tether_chance: z.number().min(0).max(1).optional().default(0),
		max_pairwise_tethers_per_floor: z.number().int().min(0).optional().default(1),
	})
	.strict()

const BackgroundLayer = z
	.object({
		asset: z.string().min(1),
		scroll_rate: z.number().min(0).optional().default(0),
		tint: HexColor.optional(),
	})
	.strict()

const FloorVisual = z
	.object({
		floors: z.array(z.number().int().min(1)).min(1),
		layers: z.array(BackgroundLayer).min(1),
		music: z.string().optional(),
		ambient: z.string().optional(),
	})
	.strict()

export const Location = z
	.object({
		id: NamespacedId,
		name: Text.optional(),
		act: z.number().int().min(1).max(10),
		map: MapConfig,
		visuals: z.array(FloorVisual).min(1),
		default_music: z.string().optional(),
		default_ambient: z.string().optional(),
		node_icons: z.record(z.string(), z.string()).optional(),
		spawn_table: SpawnTable,
		encounter_table: z
			.array(
				z
					.object({
						id: NamespacedId,
						weight_override: z.number().int().min(1).optional(),
					})
					.strict(),
			)
			.optional(),
		loot_bias: z
			.object({
				common_delta: z.number().optional(),
				rare_delta: z.number().optional(),
				legendary_delta: z.number().optional(),
			})
			.strict()
			.optional(),
	})
	.strict()

export type Location = z.infer<typeof Location>
