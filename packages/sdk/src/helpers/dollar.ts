import { Listener } from '../builders/listener'
import { Get } from '../builders/value'
import { wrapEffect } from '../internal/wrap-effect'
import type { Condition } from '../schema/condition'
import type { Effect } from '../schema/effect'
import type { Listener as ListenerType } from '../schema/listener'
import { type CondExpr, type Expr, wrapExpr } from './expr'

// --- internal helpers ---

function leaf(path: string): Expr {
	return wrapExpr(Get(path))
}

function dynProxy(prefix: string): Record<string, Expr> {
	return new Proxy({} as Record<string, Expr>, {
		get(_, key) {
			if (typeof key !== 'string') return undefined
			return leaf(`${prefix}.${key}`)
		},
	})
}

/**
 * A state namespace that is both callable and indexable:
 * - `$.run.state('my_mod:rage')` — call form, the only one that survives a
 *   namespaced key (the `:` breaks dotted property access)
 * - `$.run.state.foo` — property form, kept for bare keys and back-compat
 */
export type StateReader = ((key: string) => Expr) & Record<string, Expr>

function stateReader(prefix: string): StateReader {
	const fn = (key: string): Expr => leaf(`${prefix}.${key}`)
	return new Proxy(fn, {
		get(_t, key) {
			if (typeof key !== 'string') return undefined
			return leaf(`${prefix}.${key}`)
		},
		apply(_t, _this, args: unknown[]) {
			return leaf(`${prefix}.${String(args[0])}`)
		},
	}) as unknown as StateReader
}

// --- event payload types (fields available inside $.on.* callbacks) ---

export interface TurnStartEvent {
	side: Expr
	turn: Expr
}

export interface TurnEndEvent {
	side: Expr
	turn: Expr
}

export interface CardPlayedEvent {
	cooldown: Expr
	slot: Expr
	sourceOwnerId: Expr
}

export interface CardDrawnEvent {
	slot: Expr
}

export interface DamageIntentCreatedEvent {
	baseDamage: Expr
	sourceOwnerId: Expr
}

export interface DamageDealtEvent {
	amount: Expr
	hpLost: Expr
	sourceOwnerId: Expr
	targetEntityId: Expr
}

export interface DamageTakenEvent {
	amount: Expr
	hpLost: Expr
	blockAbsorbed: Expr
	hpPercent: Expr
	sourceOwnerId: Expr
	targetEntityId: Expr
}

export interface BlockGainedEvent {
	amount: Expr
}

export interface EnemyDiedEvent {
	targetEntityId: Expr
	aliveEnemiesCount: Expr
}

export interface EntityDiedEvent {
	targetEntityId: Expr
	aliveEnemiesCount: Expr
	aliveAlliesCount: Expr
}

export interface PlayerHpThresholdEvent {
	hpPercent: Expr
	threshold: Expr
}

export interface AllySummonedEvent {
	stacks: Expr
	sourceOwnerId: Expr
	targetEntityId: Expr
}

export interface CoinsChangedEvent {
	delta: Expr
}

export interface ChoiceMadeEvent {
	option: Expr
}

// --- static event objects (created once, reused across all callbacks) ---

const turnStartEvt: TurnStartEvent = { side: leaf('event.side'), turn: leaf('event.turn') }
const turnEndEvt: TurnEndEvent = { side: leaf('event.side'), turn: leaf('event.turn') }
const cardPlayedEvt: CardPlayedEvent = {
	cooldown: leaf('event.cooldown'),
	slot: leaf('event.slot'),
	sourceOwnerId: leaf('event.source_owner_id'),
}
const cardDrawnEvt: CardDrawnEvent = { slot: leaf('event.slot') }
const dmgIntentEvt: DamageIntentCreatedEvent = {
	baseDamage: leaf('event.base_damage'),
	sourceOwnerId: leaf('event.source_owner_id'),
}
const damageDealtEvt: DamageDealtEvent = {
	amount: leaf('event.amount'),
	hpLost: leaf('event.hp_lost'),
	sourceOwnerId: leaf('event.source_owner_id'),
	targetEntityId: leaf('event.target_entity_id'),
}
const damageTakenEvt: DamageTakenEvent = {
	amount: leaf('event.amount'),
	hpLost: leaf('event.hp_lost'),
	blockAbsorbed: leaf('event.block_absorbed'),
	hpPercent: leaf('event.hp_percent'),
	sourceOwnerId: leaf('event.source_owner_id'),
	targetEntityId: leaf('event.target_entity_id'),
}
const blockGainedEvt: BlockGainedEvent = { amount: leaf('event.amount') }
const enemyDiedEvt: EnemyDiedEvent = {
	targetEntityId: leaf('event.target_entity_id'),
	aliveEnemiesCount: leaf('event.alive_enemies_count'),
}
const entityDiedEvt: EntityDiedEvent = {
	targetEntityId: leaf('event.target_entity_id'),
	aliveEnemiesCount: leaf('event.alive_enemies_count'),
	aliveAlliesCount: leaf('event.alive_allies_count'),
}
const hpThresholdEvt: PlayerHpThresholdEvent = {
	hpPercent: leaf('event.hp_percent'),
	threshold: leaf('event.threshold'),
}
const allySummonedEvt: AllySummonedEvent = {
	stacks: leaf('event.stacks'),
	sourceOwnerId: leaf('event.source_owner_id'),
	targetEntityId: leaf('event.target_entity_id'),
}
const coinsChangedEvt: CoinsChangedEvent = { delta: leaf('event.delta') }
const choiceMadeEvt: ChoiceMadeEvent = { option: leaf('event.option') }

// --- on namespace builder ---

type Cb<E> = (ctx: { event: E }) => Effect | Effect[]
type OnOpts = { when?: Condition }

function on<E>(event: string, evtObj: E, cb: Cb<E>, opts?: OnOpts): ListenerType {
	return Listener({ onEvent: event, effect: wrapEffect(cb({ event: evtObj })), when: opts?.when })
}

const onCtx = {
	turnStart: (cb: Cb<TurnStartEvent>, opts?: OnOpts) => on('turn_start', turnStartEvt, cb, opts),
	turnEnd: (cb: Cb<TurnEndEvent>, opts?: OnOpts) => on('turn_end', turnEndEvt, cb, opts),
	cardPlayed: (cb: Cb<CardPlayedEvent>, opts?: OnOpts) =>
		on('card_played', cardPlayedEvt, cb, opts),
	cardDrawn: (cb: Cb<CardDrawnEvent>, opts?: OnOpts) => on('card_drawn', cardDrawnEvt, cb, opts),
	cardReturnedFromCooldown: (cb: Cb<CardDrawnEvent>, opts?: OnOpts) =>
		on('card_returned_from_cooldown', cardDrawnEvt, cb, opts),
	damageIntentCreated: (cb: Cb<DamageIntentCreatedEvent>, opts?: OnOpts) =>
		on('damage_intent_created', dmgIntentEvt, cb, opts),
	damageDealt: (cb: Cb<DamageDealtEvent>, opts?: OnOpts) =>
		on('damage_dealt', damageDealtEvt, cb, opts),
	damageTaken: (cb: Cb<DamageTakenEvent>, opts?: OnOpts) =>
		on('damage_taken', damageTakenEvt, cb, opts),
	blockGained: (cb: Cb<BlockGainedEvent>, opts?: OnOpts) =>
		on('block_gained', blockGainedEvt, cb, opts),
	enemyDied: (cb: Cb<EnemyDiedEvent>, opts?: OnOpts) => on('enemy_died', enemyDiedEvt, cb, opts),
	entityDied: (cb: Cb<EntityDiedEvent>, opts?: OnOpts) =>
		on('entity_died', entityDiedEvt, cb, opts),
	playerHpThreshold: (cb: Cb<PlayerHpThresholdEvent>, opts?: OnOpts) =>
		on('player_hp_threshold', hpThresholdEvt, cb, opts),
	allySummoned: (cb: Cb<AllySummonedEvent>, opts?: OnOpts) =>
		on('ally_summoned', allySummonedEvt, cb, opts),
	choiceMade: (cb: Cb<ChoiceMadeEvent>, opts?: OnOpts) =>
		on('choice_made', choiceMadeEvt, cb, opts),
	coinsChanged: (cb: Cb<CoinsChangedEvent>, opts?: OnOpts) =>
		on('coins_changed', coinsChangedEvt, cb, opts),
	playerHpChanged: (cb: Cb<DamageTakenEvent>, opts?: OnOpts) =>
		on('player_hp_changed', damageTakenEvt, cb, opts),
	cardModifierApplied: (cb: Cb<Record<string, Expr>>, opts?: OnOpts) =>
		on('card_modifier_applied', dynProxy('event'), cb, opts),
	cardModifierRemoved: (cb: Cb<Record<string, Expr>>, opts?: OnOpts) =>
		on('card_modifier_removed', dynProxy('event'), cb, opts),
	encounterOpened: (cb: Cb<Record<string, Expr>>, opts?: OnOpts) =>
		on('encounter_opened', dynProxy('event'), cb, opts),
	encounterClosed: (cb: Cb<Record<string, Expr>>, opts?: OnOpts) =>
		on('encounter_closed', dynProxy('event'), cb, opts),
	cardAcquiredCurseBound: (cb: Cb<Record<string, Expr>>, opts?: OnOpts) =>
		on('card_acquired_curse_bound', dynProxy('event'), cb, opts),
	runStateChanged: (cb: Cb<Record<string, Expr>>, opts?: OnOpts) =>
		on('run_state_changed', dynProxy('event'), cb, opts),
	/**
	 * any event name — for custom or cross-mod events. The payload shape is
	 * unknown to the type system by default; declare it to type the fields:
	 * `$.on.custom<{ severity: Expr }>('margin_call', ({ event }) => Dmg(event.severity))`
	 */
	custom: <E extends Record<string, Expr> = Record<string, Expr>>(
		event: string,
		cb: Cb<E>,
		opts?: OnOpts,
	) => on(event, dynProxy('event') as E, cb, opts),
}

// --- $ context shape ---

type DollarCtx = {
	player: {
		hp: Expr
		maxHp: Expr
		hpPercent: Expr
		block: Expr
		coins: Expr
		deckSize: Expr
		deckStacks: Expr
		relicsCount: Expr
	}
	target: {
		hp: Expr
		maxHp: Expr
		hpPercent: Expr
		block: Expr
		coins: Expr
		deckSize: Expr
	}
	card: {
		stack: Expr
		cooldown: Expr
		baseCooldown: Expr
		onCooldown: Expr
		modifierCount: Expr
		params: Record<string, Expr>
		state: Record<string, Expr>
	}
	/** contextual self-reference — resolves to the card owner inside Card listeners, the enemy inside Phase */
	self: {
		hp: Expr
		maxHp: Expr
		hpPercent: Expr
		block: Expr
		coins: Expr
	}
	modifier: {
		stack: Expr
		cooldown: Expr
		baseCooldown: Expr
		onCooldown: Expr
		params: Record<string, Expr>
		state: Record<string, Expr>
	}
	host: {
		stack: Expr
		cooldown: Expr
		baseCooldown: Expr
		onCooldown: Expr
		modifierCount: Expr
		params: Record<string, Expr>
		state: Record<string, Expr>
		owner: {
			hp: Expr
			maxHp: Expr
			hpPercent: Expr
			block: Expr
			coins: Expr
		}
	}
	battle: {
		turn: Expr
		enemiesAlive: Expr
		alliesAlive: Expr
	}
	run: {
		floor: Expr
		act: Expr
		/** run-wide state. call with a namespaced key: `$.run.state('my_mod:rage')` */
		state: StateReader
	}
	/** encounter-local state. call with a key: `$.encounter.state('harvested')` */
	encounter: {
		state: StateReader
	}
	event: {
		side: Expr
		turn: Expr
		amount: Expr
		hpLost: Expr
		blockAbsorbed: Expr
		hpPercent: Expr
		threshold: Expr
		stacks: Expr
		delta: Expr
		option: Expr
		cooldown: Expr
		baseDamage: Expr
		slot: Expr
		sourceOwnerId: Expr
		targetEntityId: Expr
		aliveEnemiesCount: Expr
		aliveAlliesCount: Expr
	}
	buff: {
		stacks: Expr
		duration: Expr
		state: Record<string, Expr>
		params: Record<string, Expr>
	}
	summoner: {
		card: { stack: Expr; params: Record<string, Expr>; state: Record<string, Expr> }
		player: { hp: Expr; maxHp: Expr; hpPercent: Expr }
	}
	/** read an arbitrary let-binding by name */
	let: (name: string) => Expr
	/** typed listener factories — subscribes to engine events */
	on: typeof onCtx
}

/**
 * Typed access to the runtime evaluation context.
 *
 * Leaf nodes are `Expr` — they can be passed directly to any builder that accepts `Value`,
 * and support fluent arithmetic (`.plus`, `.times`, `.scaled`) and comparison (`.lt`, `.gte`) methods.
 * Comparisons return `CondExpr`, which adds `.and`, `.or`, `.not`.
 *
 * ```ts
 * $.player.hpPercent.lt(30)
 * $.card.stack.gte(3).and($.player.hp.gt(0))
 * $.card.params.base.scaled().plus($.card.stack)
 * $.on.damageTaken(({ event }) => Dmg(event.hpLost))
 * ```
 */
export const $: DollarCtx = {
	player: {
		hp: leaf('player.hp'),
		maxHp: leaf('player.max_hp'),
		hpPercent: leaf('player.hp_percent'),
		block: leaf('player.block'),
		coins: leaf('player.coins'),
		deckSize: leaf('player.deck_size'),
		deckStacks: leaf('player.deck_stacks'),
		relicsCount: leaf('player.relics_count'),
	},
	target: {
		hp: leaf('target.hp'),
		maxHp: leaf('target.max_hp'),
		hpPercent: leaf('target.hp_percent'),
		block: leaf('target.block'),
		coins: leaf('target.coins'),
		deckSize: leaf('target.deck_size'),
	},
	card: {
		stack: leaf('card.stack'),
		cooldown: leaf('card.cooldown'),
		baseCooldown: leaf('card.base_cooldown'),
		onCooldown: leaf('card.on_cooldown'),
		modifierCount: leaf('card.modifier_count'),
		params: dynProxy('card.params'),
		state: dynProxy('card.state'),
	},
	self: {
		hp: leaf('self.hp'),
		maxHp: leaf('self.max_hp'),
		hpPercent: leaf('self.hp_percent'),
		block: leaf('self.block'),
		coins: leaf('self.coins'),
	},
	modifier: {
		stack: leaf('modifier.stack'),
		cooldown: leaf('modifier.cooldown'),
		baseCooldown: leaf('modifier.base_cooldown'),
		onCooldown: leaf('modifier.on_cooldown'),
		params: dynProxy('modifier.params'),
		state: dynProxy('modifier.state'),
	},
	host: {
		stack: leaf('host.stack'),
		cooldown: leaf('host.cooldown'),
		baseCooldown: leaf('host.base_cooldown'),
		onCooldown: leaf('host.on_cooldown'),
		modifierCount: leaf('host.modifier_count'),
		params: dynProxy('host.params'),
		state: dynProxy('host.state'),
		owner: {
			hp: leaf('host.owner.hp'),
			maxHp: leaf('host.owner.max_hp'),
			hpPercent: leaf('host.owner.hp_percent'),
			block: leaf('host.owner.block'),
			coins: leaf('host.owner.coins'),
		},
	},
	battle: {
		turn: leaf('battle.turn'),
		enemiesAlive: leaf('battle.enemies_alive'),
		alliesAlive: leaf('battle.allies_alive'),
	},
	run: {
		floor: leaf('run.floor'),
		act: leaf('run.act'),
		state: stateReader('run.state'),
	},
	encounter: {
		state: stateReader('encounter.state'),
	},
	event: {
		side: leaf('event.side'),
		turn: leaf('event.turn'),
		amount: leaf('event.amount'),
		hpLost: leaf('event.hp_lost'),
		blockAbsorbed: leaf('event.block_absorbed'),
		hpPercent: leaf('event.hp_percent'),
		threshold: leaf('event.threshold'),
		stacks: leaf('event.stacks'),
		delta: leaf('event.delta'),
		option: leaf('event.option'),
		cooldown: leaf('event.cooldown'),
		baseDamage: leaf('event.base_damage'),
		slot: leaf('event.slot'),
		sourceOwnerId: leaf('event.source_owner_id'),
		targetEntityId: leaf('event.target_entity_id'),
		aliveEnemiesCount: leaf('event.alive_enemies_count'),
		aliveAlliesCount: leaf('event.alive_allies_count'),
	},
	buff: {
		stacks: leaf('buff.stacks'),
		duration: leaf('buff.duration'),
		state: dynProxy('buff.state'),
		params: dynProxy('buff.params'),
	},
	summoner: {
		card: {
			stack: leaf('summoner.card.stack'),
			params: dynProxy('summoner.card.params'),
			state: dynProxy('summoner.card.state'),
		},
		player: {
			hp: leaf('summoner.player.hp'),
			maxHp: leaf('summoner.player.max_hp'),
			hpPercent: leaf('summoner.player.hp_percent'),
		},
	},
	let: (name: string) => leaf(`let.${name}`),
	on: onCtx,
}

export type { CondExpr, Expr }
