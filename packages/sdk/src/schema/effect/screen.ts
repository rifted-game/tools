import { z } from 'zod'

import { Affinity, Rarity, ScreenKind } from '../enums'
import { NamespacedId, Text } from '../primitives'
import { Value } from '../value'

export const offerCardFromPoolEffect = z
	.object({
		do: z.literal('offer_card_from_pool'),
		rarity: Rarity.optional(),
		affinity: Affinity.optional(),
		count: z.number().int().min(1).optional().default(3),
		pick_max: z.number().int().min(0).optional().default(1),
		cost: Value.optional(),
		skip_allowed: z.boolean().optional().default(true),
	})
	.strict()

export const offerRelicEffect = z
	.object({
		do: z.literal('offer_relic'),
		id: NamespacedId.optional(),
		rarity: Rarity.optional(),
		cost: Value.optional(),
	})
	.strict()

export const openEncounterEffect = z
	.object({ do: z.literal('open_encounter'), id: NamespacedId })
	.strict()

export const screenSpec = z
	.object({
		kind: ScreenKind,
		title: Text.optional(),
		body: Text.optional(),
		config: z.record(z.string(), z.unknown()).optional(),
	})
	.strict()

export const showScreenEffect = z
	.object({ do: z.literal('show_screen'), screen: screenSpec })
	.strict()

export const screenEffects = [
	offerCardFromPoolEffect,
	offerRelicEffect,
	openEncounterEffect,
	showScreenEffect,
] as const
