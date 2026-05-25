import { z } from 'zod'

import { Target } from '../enums'
import { BareId, NamespacedStateKey } from '../primitives'
import { Value } from '../value'

export const addCoinsEffect = z
	.object({
		do: z.literal('add_coins'),
		target: Target.optional(),
		amount: Value,
	})
	.strict()

export const spendCoinsEffect = z
	.object({
		do: z.literal('spend_coins'),
		target: Target.optional(),
		amount: Value,
	})
	.strict()

export const healEffect = z
	.object({ do: z.literal('heal'), target: Target.optional(), amount: Value })
	.strict()

export const setRunStateEffect = z
	.object({
		do: z.literal('set_run_state'),
		key: NamespacedStateKey,
		value: Value,
	})
	.strict()

export const addRunStateEffect = z
	.object({
		do: z.literal('add_run_state'),
		key: NamespacedStateKey,
		value: Value,
	})
	.strict()

export const clearRunStateEffect = z
	.object({ do: z.literal('clear_run_state'), key: NamespacedStateKey })
	.strict()

export const setEncounterStateEffect = z
	.object({ do: z.literal('set_encounter_state'), key: BareId, value: Value })
	.strict()

export const addEncounterStateEffect = z
	.object({ do: z.literal('add_encounter_state'), key: BareId, value: Value })
	.strict()

export const runEffects = [
	addCoinsEffect,
	spendCoinsEffect,
	healEffect,
	setRunStateEffect,
	addRunStateEffect,
	clearRunStateEffect,
	setEncounterStateEffect,
	addEncounterStateEffect,
] as const
