import { z } from 'zod'

import { ActorPosition } from '../actor-position'
import { BareId } from '../primitives'
import { TextWithVariants } from '../text-variants'

export const playClipEffect = z
	.object({
		do: z.literal('play_clip'),
		actor: BareId,
		clip: z.string().min(1),
		loop: z.boolean().optional().default(false),
	})
	.strict()

export const sayEffect = z
	.object({
		do: z.literal('say'),
		actor: BareId,
		text: TextWithVariants,
		per_player: z.boolean().optional().default(false),
	})
	.strict()

export const waitEffect = z
	.object({ do: z.literal('wait'), duration: z.number().positive().max(30) })
	.strict()

export const waitForInputEffect = z.object({ do: z.literal('wait_for_input') }).strict()

export const showChoicesEffect = z.object({ do: z.literal('show_choices') }).strict()

export const playSfxEffect = z
	.object({ do: z.literal('play_sfx'), asset: z.string().min(1) })
	.strict()

export const setActorPositionEffect = z
	.object({
		do: z.literal('set_actor_position'),
		actor: BareId,
		position: ActorPosition,
		duration: z.number().min(0).optional().default(0.3),
	})
	.strict()

export const closeEncounterEffect = z.object({ do: z.literal('close_encounter') }).strict()

export const presentationEffects = [
	playClipEffect,
	sayEffect,
	waitEffect,
	waitForInputEffect,
	showChoicesEffect,
	playSfxEffect,
	setActorPositionEffect,
	closeEncounterEffect,
] as const
