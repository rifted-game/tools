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

/** the bare trigger-slot names a clip may bind to via its `on` field */
export type TriggerSlot =
	| 'spawn'
	| 'idle'
	| 'hurt'
	| 'death'
	| 'attack'
	| 'defend'
	| 'charge_start'
	| 'charge_end'
	| 'curse'
	| 'phase_transition'
	| 'buff_applied'
	| 'debuff_applied'
	| 'play'
	| 'craft'
	| 'draw'
	| 'cooldown_start'
	| 'reveal'
	| 'modifier_applied'

/** a clip that also declares which trigger slot(s) play it */
export interface SpriteClip {
	frames: number[]
	fps: number
	loop?: boolean
	next?: string
	/** trigger slot(s) that play this clip, e.g. `on: 'idle'` or `on: ['attack', 'curse']` */
	on?: TriggerSlot | TriggerSlot[]
}

/**
 * Sprite-sheet animation set without the wrapper ceremony. Each clip carries its
 * own trigger via `on`, so a clip name is written once instead of being repeated
 * across a separate `triggers` map.
 *
 * ```ts
 * sprites('assets/chars/goblin.png', [64, 64], {
 *   idle: { frames: range(0, 3), fps: 6, loop: true, on: 'idle' },
 *   attack: { frames: range(4, 6), fps: 12, on: 'attack' },
 * })
 * ```
 */
export function sprites(
	spriteSheet: string,
	frameSize: [number, number],
	clips: Record<string, SpriteClip>,
): SpriteSheetAnim {
	const outClips: Record<string, unknown> = {}
	const triggers: Record<string, string> = {}
	for (const [name, clip] of Object.entries(clips)) {
		const c: Record<string, unknown> = { frames: clip.frames, fps: clip.fps }
		if (clip.loop !== undefined) c.loop = clip.loop
		if (clip.next !== undefined) c.next = clip.next
		outClips[name] = c
		if (clip.on !== undefined) {
			const slots = Array.isArray(clip.on) ? clip.on : [clip.on]
			for (const slot of slots) triggers[`on_${slot}`] = name
		}
	}
	return {
		kind: 'sprite_sheet',
		sprite_sheet: spriteSheet,
		frame_size: frameSize,
		clips: outClips,
		triggers,
	} as SpriteSheetAnim
}
