import { pack } from '../internal/pack'
import type { AnimationSet } from '../schema/animation'
import type { Card as CardSchema } from '../schema/card'
import type { Effect } from '../schema/effect'
import type { Affinity, ModeTag, Rarity, ScaleType } from '../schema/enums'
import type { Listener } from '../schema/listener'
import type { AsModifier } from '../schema/modifier'
import type { Text } from '../schema/primitives'
import type { StateInit } from '../schema/state'
import type { Value } from '../schema/value'

interface RevealTriggerOpts {
	kind: 'damage_taken' | 'turn_n' | 'enemy_died' | 'block_broken' | 'ally_buffed'
	threshold?: number
}

export interface CardOpts {
	id: string
	affinity: Affinity
	rarity: Rarity
	baseCooldown: number
	scaleType: ScaleType
	params: Record<string, number>
	/**
	 * Display name shown on the card.
	 *
	 * When omitted the engine looks up `<namespace>-card-<name>.name` from the
	 * mod's ftl files. Example: id `my_mod:rage` → key `my_mod-card-rage.name`.
	 *
	 * Pass `{ key: 'my_mod-card-rage-alt' }` to use a different key.
	 * Pass a plain string or `{ en: '...', ru: '...' }` for inline text.
	 */
	name?: Text
	/**
	 * Rules text shown below the card name.
	 *
	 * When omitted resolves to `<namespace>-card-<name>.description`.
	 *
	 * The engine exposes card `params` as Fluent variables automatically:
	 * `params: { base: 8 }` makes `{ $base }` available in the ftl description.
	 * Use `render` to expose computed or renamed values instead.
	 *
	 * Example ftl:
	 * ```
	 * my_mod-card-strike = Strike
	 *     .description = Deal { $base } damage.
	 * ```
	 */
	description?: Text
	/**
	 * Named values exposed as Fluent variables in the ftl description.
	 * Each key becomes `{ $key }` in the message.
	 *
	 * Example: `render: { damage: Scale(Param('base')) }` → `Deal { $damage } damage.`
	 *
	 * When omitted, all `params` keys are auto-exposed by their own names.
	 * Only set `render` when you need computed, scaled, or renamed values.
	 */
	render?: Record<string, Value>
	modeTags?: ModeTag[]
	initialState?: Record<string, StateInit>
	hiddenUntilRevealed?: boolean
	revealTriggers?: RevealTriggerOpts[]
	initialCharges?: number
	consumeChargesOnPlay?: boolean
	acceptsModifiers?: boolean
	/**
	 * Makes this card a modifier donor. Setting this field automatically marks
	 * the card as `is_modifier_donor` and sets `accepts_modifiers: false`.
	 */
	asModifier?: AsModifier
	icon?: string
	modifierIcon?: string
	sfxPlay?: string
	sfxCraft?: string
	animationSet?: AnimationSet
	onPlay?: Effect
	onCraft?: Effect
	passiveListeners?: Listener[]
}

const cardRenames = {
	baseCooldown: 'base_cooldown',
	scaleType: 'scale_type',
	modeTags: 'mode_tags',
	initialState: 'initial_state',
	hiddenUntilRevealed: 'hidden_until_revealed',
	revealTriggers: 'reveal_triggers',
	initialCharges: 'initial_charges',
	consumeChargesOnPlay: 'consume_charges_on_play',
	isModifierDonor: 'is_modifier_donor',
	acceptsModifiers: 'accepts_modifiers',
	asModifier: 'as_modifier',
	modifierIcon: 'modifier_icon',
	sfxPlay: 'sfx_play',
	sfxCraft: 'sfx_craft',
	animationSet: 'animation_set',
	onPlay: 'on_play',
	onCraft: 'on_craft',
	passiveListeners: 'passive_listeners',
}

/** define a card */
export function Card(opts: CardOpts): CardSchema {
	const required = {
		id: opts.id,
		affinity: opts.affinity,
		rarity: opts.rarity,
		base_cooldown: opts.baseCooldown,
		scale_type: opts.scaleType,
		params: opts.params,
	}
	const optional = {
		name: opts.name,
		description: opts.description,
		modeTags: opts.modeTags,
		render: opts.render,
		initialState: opts.initialState,
		hiddenUntilRevealed: opts.hiddenUntilRevealed,
		revealTriggers: opts.revealTriggers,
		initialCharges: opts.initialCharges,
		consumeChargesOnPlay: opts.consumeChargesOnPlay,
		// asModifier presence implies donor — no need to set isModifierDonor manually
		isModifierDonor: opts.asModifier !== undefined ? true : undefined,
		acceptsModifiers: opts.asModifier !== undefined ? false : opts.acceptsModifiers,
		asModifier: opts.asModifier,
		icon: opts.icon,
		modifierIcon: opts.modifierIcon,
		sfxPlay: opts.sfxPlay,
		sfxCraft: opts.sfxCraft,
		animationSet: opts.animationSet,
		onPlay: opts.onPlay,
		onCraft: opts.onCraft,
		passiveListeners: opts.passiveListeners,
	}
	return pack(required, optional, cardRenames) as unknown as CardSchema
}
