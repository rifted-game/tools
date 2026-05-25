import type { AnimationSet } from '../schema/animation'

type SpriteSheetAnim = Extract<AnimationSet, { kind: 'sprite_sheet' }>
type GodotAnim = Extract<AnimationSet, { kind: 'godot_resource' }>

interface AnimClipOpts {
	frames: number[]
	fps: number
	loop?: boolean
	next?: string
}

/** one named animation clip inside a sprite sheet */
export function AnimClip(opts: AnimClipOpts) {
	const out: any = { frames: opts.frames, fps: opts.fps }
	if (opts.loop !== undefined) out.loop = opts.loop
	if (opts.next !== undefined) out.next = opts.next
	return out
}

const triggerRenames: Record<string, string> = {
	onSpawn: 'on_spawn',
	onIdle: 'on_idle',
	onHurt: 'on_hurt',
	onDeath: 'on_death',
	onAttack: 'on_attack',
	onDefend: 'on_defend',
	onChargeStart: 'on_charge_start',
	onChargeEnd: 'on_charge_end',
	onCurse: 'on_curse',
	onPhaseTransition: 'on_phase_transition',
	onBuffApplied: 'on_buff_applied',
	onDebuffApplied: 'on_debuff_applied',
	onPlay: 'on_play',
	onCraft: 'on_craft',
	onDraw: 'on_draw',
	onCooldownStart: 'on_cooldown_start',
	onReveal: 'on_reveal',
	onModifierApplied: 'on_modifier_applied',
}

type AnimTriggerSlots = {
	onSpawn?: string
	onIdle?: string
	onHurt?: string
	onDeath?: string
	onAttack?: string
	onDefend?: string
	onChargeStart?: string
	onChargeEnd?: string
	onCurse?: string
	onPhaseTransition?: string
	onBuffApplied?: string
	onDebuffApplied?: string
	onPlay?: string
	onCraft?: string
	onDraw?: string
	onCooldownStart?: string
	onReveal?: string
	onModifierApplied?: string
}

/** map engine trigger slots to clip names. omit unused slots */
export function AnimTriggers(opts: AnimTriggerSlots) {
	const out: any = {}
	for (const [key, value] of Object.entries(opts)) {
		if (value === undefined) continue
		out[triggerRenames[key] ?? key] = value
	}
	return out
}

/** sprite-sheet animation set — the only kind available to mods */
export function AnimationSetSprite(opts: {
	spriteSheet: string
	frameSize: [number, number]
	clips: Record<string, ReturnType<typeof AnimClip>>
	triggers: ReturnType<typeof AnimTriggers>
}): SpriteSheetAnim {
	return {
		kind: 'sprite_sheet',
		sprite_sheet: opts.spriteSheet,
		frame_size: opts.frameSize,
		clips: opts.clips,
		triggers: opts.triggers,
	} as SpriteSheetAnim
}

/** godot-native animation set — reserved for core game content */
export function AnimationSetGodot(opts: {
	resource: string
	triggers: ReturnType<typeof AnimTriggers>
}): GodotAnim {
	return {
		kind: 'godot_resource',
		resource: opts.resource,
		triggers: opts.triggers,
	} as GodotAnim
}
