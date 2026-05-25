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
	name?: Text
	description?: Text
	modeTags?: ModeTag[]
	render?: Record<string, Value>
	initialState?: Record<string, StateInit>
	hiddenUntilRevealed?: boolean
	revealTriggers?: RevealTriggerOpts[]
	initialCharges?: number
	consumeChargesOnPlay?: boolean
	isModifierDonor?: boolean
	acceptsModifiers?: boolean
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

/** define a card. composed of required mechanical fields and optional visual/state overrides */
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
		isModifierDonor: opts.isModifierDonor,
		acceptsModifiers: opts.acceptsModifiers,
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
