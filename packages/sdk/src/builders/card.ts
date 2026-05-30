import { Get } from '../builders/value'
import { type Expr, wrapExpr } from '../helpers/expr'
import { normalizeInitialState, type StateInitInput } from '../helpers/state'
import { pack } from '../internal/pack'
import { wrapEffect } from '../internal/wrap-effect'
import type { AnimationSet } from '../schema/animation'
import type { Card as CardSchema } from '../schema/card'
import type { Effect } from '../schema/effect'
import type { Affinity, ModeTag, Rarity, ScaleType } from '../schema/enums'
import type { Listener } from '../schema/listener'
import type { Text } from '../schema/primitives'
import type { Value } from '../schema/value'
import { AddCardState, SetCardState } from './effect/cards'
import { AsModifier, type AsModifierOpts } from './modifier'

// --- callback context types ---

type ParamProxy<P extends Record<string, number>> = { readonly [K in keyof P]: Expr }
type StateProxy<S> = { readonly [K in keyof S]: Expr }

interface CardSelfCtx<S> {
	stack: Expr
	cooldown: Expr
	/** typed read access to this card's state fields */
	state: StateProxy<S>
	/** atomically add to a state field on this card (add_card_state, target self) */
	add(key: keyof S & string, value: Value): Effect
	/** set a state field on this card to an exact value (set_card_state, target self) */
	set(key: keyof S & string, value: Value): Effect
}

export interface CardPlayCtx<
	P extends Record<string, number> = Record<string, number>,
	S = Record<string, StateInitInput>,
> {
	params: ParamProxy<P>
	self: CardSelfCtx<S>
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

function makeStateProxy<S>(prefix: string): StateProxy<S> {
	return new Proxy({} as StateProxy<S>, {
		get(_, key) {
			if (typeof key !== 'string') return undefined
			return wrapExpr(Get(`${prefix}.state.${key}`))
		},
	})
}

function makeCardCtx<P extends Record<string, number>, S>(): CardPlayCtx<P, S> {
	return {
		params: makeParamProxy<P>('card'),
		self: {
			stack: wrapExpr(Get('card.stack')),
			cooldown: wrapExpr(Get('card.cooldown')),
			state: makeStateProxy<S>('card'),
			add: (key, value) => AddCardState({ key, value }),
			set: (key, value) => SetCardState({ key, value }),
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

export interface CardOpts<
	P extends Record<string, number> = Record<string, number>,
	S extends Record<string, StateInitInput> = Record<string, StateInitInput>,
> {
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
	 *
	 * The callback form gives typed access to `params`/`self` (the same ctx as
	 * `onPlay`), so a typo like `params.kik` is a compile error instead of the
	 * silent miss you'd get reaching through the global `$`.
	 */
	render?: Record<string, Value> | ((ctx: CardPlayCtx<P, S>) => Record<string, Value>)
	modeTags?: ModeTag[]
	/**
	 * Initial values for this card's state fields. A bare number is shorthand for
	 * a constant; use `randInt(min, max)` for a random roll, or the full
	 * `{ const, decay }` form when a field decays. Declaring `initialState`
	 * (without an explicit second type arg) infers the state shape, so
	 * `self.state` / `self.add` / `self.set` become typed to these keys.
	 */
	initialState?: S
	hiddenUntilRevealed?: boolean
	revealTriggers?: RevealTriggerOpts[]
	/**
	 * Reveal conditions for a hidden card. Setting a non-empty `revealOn`
	 * implies `hidden_until_revealed: true` — no separate flag needed.
	 * Build entries with the `onTurn`/`onEnemyDeath`/… helpers.
	 */
	revealOn?: RevealTriggerOpts[]
	initialCharges?: number
	consumeChargesOnPlay?: boolean
	/** charge configuration. groups `initial_charges` + `consume_charges_on_play` */
	charges?: { initial?: number; consumeOnPlay?: boolean }
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
	onPlay?: EffectInput<CardPlayCtx<P, S>>
	/** effect on craft. callback receives typed `params` and `self` accessors */
	onCraft?: EffectInput<CardPlayCtx<P, S>>
	/** passive listeners. callback receives typed `params` and `self` accessors */
	passiveListeners?: ListenerInput<CardPlayCtx<P, S>>
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
} as const

/** define a card */
export function Card<
	P extends Record<string, number> = Record<string, number>,
	const S extends Record<string, StateInitInput> = Record<string, StateInitInput>,
>(opts: CardOpts<P, S>): CardSchema {
	const ctx = makeCardCtx<P, S>()
	// render may be a callback — resolve it with the same ctx as onPlay
	const renderResolved = typeof opts.render === 'function' ? opts.render(ctx) : opts.render
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
		render: renderResolved,
		initialState: normalizeInitialState(opts.initialState),
		hiddenUntilRevealed:
			opts.revealOn !== undefined && opts.revealOn.length > 0 ? true : opts.hiddenUntilRevealed,
		revealTriggers: opts.revealOn ?? opts.revealTriggers,
		initialCharges: opts.charges?.initial ?? opts.initialCharges,
		consumeChargesOnPlay: opts.charges?.consumeOnPlay ?? opts.consumeChargesOnPlay,
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
