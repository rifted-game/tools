import { z } from 'zod'

import { Target } from '../enums'
import { BareId, NamespacedId } from '../primitives'
import { Value } from '../value'

export const reduceCooldownEffect = z
	.object({
		do: z.literal('reduce_ally_cooldown'),
		target: Target,
		amount: Value,
	})
	.strict()

export const resetCooldownEffect = z
	.object({ do: z.literal('reset_ally_card_cooldown'), target: Target })
	.strict()

export const removeCardEffect = z
	.object({ do: z.literal('remove_card_from_deck'), target: Target })
	.strict()

export const removeRandomCardsEffect = z
	.object({
		do: z.literal('remove_random_cards'),
		target: Target.optional(),
		count: Value,
	})
	.strict()

export const grantChargesEffect = z
	.object({
		do: z.literal('grant_ally_card_charges'),
		target: Target,
		amount: Value,
	})
	.strict()

export const addCardStateEffect = z
	.object({
		do: z.literal('add_card_state'),
		target: Target.optional(),
		key: BareId,
		value: Value,
	})
	.strict()

export const setCardStateEffect = z
	.object({
		do: z.literal('set_card_state'),
		target: Target.optional(),
		key: BareId,
		value: Value,
	})
	.strict()

export const addCardToDeckEffect = z
	.object({
		do: z.literal('add_card_to_player_deck'),
		target: Target,
		card: NamespacedId,
		temporary: z.boolean().optional().default(false),
	})
	.strict()

export const stealCardEffect = z.object({ do: z.literal('steal_card'), target: Target }).strict()

export const cardEffects = [
	reduceCooldownEffect,
	resetCooldownEffect,
	removeCardEffect,
	removeRandomCardsEffect,
	grantChargesEffect,
	addCardStateEffect,
	setCardStateEffect,
	addCardToDeckEffect,
	stealCardEffect,
] as const
