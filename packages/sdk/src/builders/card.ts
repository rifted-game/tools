import { Get } from '../builders/value'
import { type Expr, wrapExpr } from '../helpers/expr'
import { pack } from '../internal/pack'
import { wrapEffect } from '../internal/wrap-effect'
import type { AnimationSet } from '../schema/animation'
import type { Card as CardSchema } from '../schema/card'
import type { Effect } from '../schema/effect'
import type { Affinity, ModeTag, Rarity, ScaleType } from '../schema/enums'
import type { Listener } from '../schema/listener'
import type { Text } from '../schema/primitives'
import type { StateInit } from '../schema/state'
import type { Value } from '../schema/value'
import { AsModifier, type AsModifierOpts } from './modifier'

// --- callback context types ---

type ParamProxy<P extends Record<string, number>> = { readonly [K in keyof P]: Expr }

interface CardSelfCtx {
	stack: Expr
	cooldown: Expr
	state: Record<string, Expr>
}

export interface CardPlayCtx<P extends Record<string, number> = Record<string, number>> {
	params: ParamProxy<P>
	self: CardSelfCtx
}

// --- runtime context factories ---

function makeParamProxy<P extends Record<string, number>>(prefix: string): ParamProxy<P> {
	return new Proxy({} as ParamProxy<P>, {
		get(_, key) {
			if (typeof key !== 'string') return undefined
			return wrapExpr(Get(`${prefix}.params.${key}`))
		},
	})
}

function makeStateProxy(prefix: string): Record<string, Expr> {
	return new Proxy({} as Record<string, Expr>, {
		get(_, key) {
			if (typeof key !== 'string') return undefined
			return wrapExpr(Get(`${prefix}.state.${key}`))
		},
	})
}

function makeCardCtx<P extends Record<string, number>>(): CardPlayCtx<P> {
	return {
		params: makeParamProxy<P>('card'),
		self: {
			stack: wrapExpr(Get('card.stack')),
			cooldown: wrapExpr(Get('card.cooldown')),
			state: makeStateProxy('card'),
		},
	}
}

// --- helpers ---

type EffectInput<C> = ((ctx: C) => Effect | Effect[]) | Effect | Effect[]
type ListenerInput<C> = ((ctx: C) => Listener | Listener[]) | Listener[]

function resolveEffect<C>(input: EffectInput<C> | undefined, ctx: C): Effect | undefined {
	if (input === undefined) return undefined
	if (typeof input === 'function') return wrapEffect(input(ctx))
	return wrapEffect(input)
}

function resolveListeners<C>(input: ListenerInput<C> | undefined, ctx: C): Listener[] | undefined {
	if (input === undefined) return undefined
	if (typeof input === 'function') {
		const result = input(ctx)
		return Array.isArray(result) ? result : [result]
	}
	return input
}

// --- RevealTrigger ---

interface RevealTriggerOpts {
	kind: 'damage_taken' | 'turn_n' | 'enemy_died' | 'block_broken' | 'ally_buffed'
	threshold?: number
}

// --- CardOpts ---

export interface CardOpts<P extends Record<string, number> = Record<string, number>> {
	id: string
	affinity: Affinity
	rarity: Rarity
	baseCooldown: number
	scaleType: ScaleType
	/** card parameters. defaults to {} when omitted */
	params?: P
	/**
	 * Display name shown on the card.
	 *
	 * When omitted the engine looks up `<namespace>-card-<name>.name` from the
	 * mod's ftl files. Example: id `my_mod:rage` → key `my_mod-card-rage.name`.
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
	 */
	description?: Text
	/**
	 * Named values exposed as Fluent variables in the ftl description.
	 *
	 * When `render` is omitted every `params` key is exposed under its own name.
	 * Set `render` only when you need computed, scaled, or renamed variables.
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
	asModifier?: AsModifierOpts
	icon?: string
	modifierIcon?: string
	sfxPlay?: string
	sfxCraft?: string
	animationSet?: AnimationSet
	/** effect on play. callback receives typed `params` and `self` accessors */
	onPlay?: EffectInput<CardPlayCtx<P>>
	/** effect on craft. callback receives typed `params` and `self` accessors */
	onCraft?: EffectInput<CardPlayCtx<P>>
	/** passive listeners. callback receives typed `params` and `self` accessors */
	passiveListeners?: ListenerInput<CardPlayCtx<P>>
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
export function Card<P extends Record<string, number> = Record<string, number>>(
	opts: CardOpts<P>,
): CardSchema {
	const ctx = makeCardCtx<P>()
	const required = {
		id: opts.id,
		affinity: opts.affinity,
		rarity: opts.rarity,
		base_cooldown: opts.baseCooldown,
		scale_type: opts.scaleType,
		params: opts.params ?? {},
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
		isModifierDonor: opts.asModifier !== undefined ? true : undefined,
		acceptsModifiers: opts.asModifier !== undefined ? false : opts.acceptsModifiers,
		asModifier: opts.asModifier !== undefined ? AsModifier(opts.asModifier) : undefined,
		icon: opts.icon,
		modifierIcon: opts.modifierIcon,
		sfxPlay: opts.sfxPlay,
		sfxCraft: opts.sfxCraft,
		animationSet: opts.animationSet,
		onPlay: resolveEffect(opts.onPlay, ctx),
		onCraft: resolveEffect(opts.onCraft, ctx),
		passiveListeners: resolveListeners(opts.passiveListeners, ctx),
	}
	return pack(required, optional, cardRenames) as unknown as CardSchema
}
