import { z } from 'zod'

import { BareId } from './primitives'

const AssetPathMod = z
	.string()
	.regex(/^assets\/[a-z0-9_/.-]+\.(png|webp|ogg|wav)$/, 'mod asset path required')

const AssetPathCore = z.string().regex(/^assets:\/\/[a-z0-9_/.-]+$/, 'core asset path required')

// one named animation clip inside a sprite sheet
const AnimClipSchema = z
	.object({
		frames: z.array(z.number().int().min(0)).min(1),
		fps: z.number().positive().max(120),
		loop: z.boolean().optional().default(false),
		next: z.string().optional(),
	})
	.strict()

// engine trigger slot names mapped to clip names
const AnimTriggersSchema = z
	.object({
		on_spawn: z.string().optional(),
		on_idle: z.string().optional(),
		on_hurt: z.string().optional(),
		on_death: z.string().optional(),
		on_attack: z.string().optional(),
		on_defend: z.string().optional(),
		on_charge_start: z.string().optional(),
		on_charge_end: z.string().optional(),
		on_curse: z.string().optional(),
		on_phase_transition: z.string().optional(),
		on_buff_applied: z.string().optional(),
		on_debuff_applied: z.string().optional(),
		on_play: z.string().optional(),
		on_craft: z.string().optional(),
		on_draw: z.string().optional(),
		on_cooldown_start: z.string().optional(),
		on_reveal: z.string().optional(),
		on_modifier_applied: z.string().optional(),
	})
	.strict()

// sprite-sheet animation — the only kind available to mods
const AnimationSetSprite = z
	.object({
		kind: z.literal('sprite_sheet'),
		sprite_sheet: AssetPathMod,
		frame_size: z.tuple([z.number().int().min(1), z.number().int().min(1)]),
		clips: z.record(BareId, AnimClipSchema),
		triggers: AnimTriggersSchema,
	})
	.strict()

// godot-native animation — reserved for core game content
const AnimationSetGodot = z
	.object({
		kind: z.literal('godot_resource'),
		resource: AssetPathCore,
		triggers: AnimTriggersSchema,
	})
	.strict()

export const AnimationSet = z.discriminatedUnion('kind', [AnimationSetSprite, AnimationSetGodot])
export type AnimationSet = z.infer<typeof AnimationSet>
