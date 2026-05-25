import { z } from 'zod'

import { AnimationSet } from './animation'
import { Effect } from './effect'
import { Affinity, ModeTag, Rarity, RevealKind, ScaleType } from './enums'
import { Listener } from './listener'
import { AsModifier } from './modifier'
import { NamespacedId, Text } from './primitives'
import { StateInit } from './state'
import { Value } from './value'

const RevealTrigger = z
	.object({ kind: RevealKind, threshold: z.number().int().min(1).optional() })
	.strict()

// donor/host invariant enforced via refine: is_modifier_donor=true requires
// as_modifier, and as_modifier requires is_modifier_donor=true
export const Card = z
	.object({
		id: NamespacedId,
		name: Text.optional(),
		description: Text.optional(),
		affinity: Affinity,
		rarity: Rarity,
		mode_tags: z.array(ModeTag).optional(),
		base_cooldown: z.number().int().min(0).max(10),
		scale_type: ScaleType,
		params: z.record(z.string(), z.number()),
		render: z.record(z.string(), Value).optional(),
		initial_state: z.record(z.string(), StateInit).optional(),
		hidden_until_revealed: z.boolean().optional().default(false),
		reveal_triggers: z.array(RevealTrigger).min(1).optional(),
		initial_charges: z.number().int().min(0).optional(),
		consume_charges_on_play: z.boolean().optional().default(false),
		is_modifier_donor: z.boolean().optional().default(false),
		accepts_modifiers: z.boolean().optional().default(true),
		as_modifier: AsModifier.optional(),
		icon: z.string().optional(),
		modifier_icon: z.string().optional(),
		sfx_play: z.string().optional(),
		sfx_craft: z.string().optional(),
		animation_set: AnimationSet.optional(),
		on_play: Effect.optional(),
		on_craft: Effect.optional(),
		passive_listeners: z.array(Listener).optional(),
	})
	.strict()
	.refine(
		c => {
			if (c.is_modifier_donor && !c.as_modifier) return false
			return !(c.as_modifier && !c.is_modifier_donor)
		},
		{ message: 'is_modifier_donor=true requires as_modifier, and vice versa' },
	)

export type Card = z.infer<typeof Card>
