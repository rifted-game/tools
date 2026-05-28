import { z } from 'zod'

import { Condition } from '../condition'
import { MultiTarget } from '../enums'
import { BareId } from '../primitives'
import { Value } from '../value'

import { EffectLazy } from './base'

export const sequenceEffect = z
	.object({ do: z.literal('sequence'), effects: z.array(EffectLazy).min(1) })
	.strict()

export const repeatEffect = z
	.object({ do: z.literal('repeat'), count: Value, effect: EffectLazy })
	.strict()

export const ifEffect = z
	.object({
		do: z.literal('if'),
		condition: Condition,
		then: EffectLazy,
		else: EffectLazy.optional(),
	})
	.strict()

export const letEffect = z
	.object({
		do: z.literal('let'),
		bindings: z.record(z.string(), Value),
		in: EffectLazy,
	})
	.strict()

export const foreachEffect = z
	.object({
		do: z.literal('foreach'),
		targets: MultiTarget,
		as: BareId,
		effect: EffectLazy,
	})
	.strict()

export const randomEffect = z
	.object({ do: z.literal('random'), options: z.array(EffectLazy).min(2) })
	.strict()

export const chanceEffect = z
	.object({
		do: z.literal('chance'),
		options: z
			.array(z.object({ weight: z.number().int().min(1), effect: EffectLazy }).strict())
			.min(2),
	})
	.strict()

export const emitEventEffect = z
	.object({
		do: z.literal('emit_event'),
		event: BareId,
		payload: z.record(z.string(), Value).optional(),
		tags: z.record(z.string(), z.string()).optional(),
	})
	.strict()

export const triggerAfterEffect = z
	.object({
		do: z.literal('trigger_after'),
		turns: z.number().int().min(1).max(10),
		effect: EffectLazy,
	})
	.strict()

export const compositeEffects = [
	sequenceEffect,
	repeatEffect,
	ifEffect,
	letEffect,
	foreachEffect,
	randomEffect,
	chanceEffect,
	emitEventEffect,
	triggerAfterEffect,
] as const
