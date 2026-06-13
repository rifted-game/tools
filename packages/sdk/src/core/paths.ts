// Context paths: typed objects authors read the world through
// (self.hpPercent, card.params.base, mod.stack, event.amount). Every
// property is an Expr carrying a path from the engine's resolve tables;
// state maps are Proxy dictionaries whose entries both read (Expr) and
// mutate (inc/set → add_state/set_state)

import { snakeKey } from './events'
import { assertValue, type Cap, Expr, type ExprLike } from './expr'
import { pushEffect } from './scope'

export type Params = Record<string, number>

/** lazy path dictionary: any property name → node */
function record<T extends object>(make: (key: string) => T): Record<string, T> {
	return new Proxy({} as Record<string, T>, {
		get(_, prop) {
			if (typeof prop !== 'string') return undefined
			return make(prop)
		},
	})
}

/** engine state level for add_state/set_state */
export type StateLevel = 'card' | 'card_battle' | 'unit' | 'player' | 'team' | 'match'

/** a state entry: reads as an Expr, mutates via inc/set effects */
export class StateEntry<N extends Cap = never> extends Expr<N> {
	constructor(
		path: string,
		private readonly level: StateLevel,
		private readonly key: string,
	) {
		super(path)
	}

	/** add to the value (add_state) */
	inc<M extends Cap = never>(v: ExprLike<M>): void {
		assertValue(v, '.inc()')
		pushEffect(['add_state', this.level, this.key, v])
	}

	/** write the value (set_state) */
	set<M extends Cap = never>(v: ExprLike<M>): void {
		assertValue(v, '.set()')
		pushEffect(['set_state', this.level, this.key, v])
	}
}

// --- battle units ---

export interface UnitPaths {
	readonly hp: Expr<'battle'>
	readonly maxHp: Expr<'battle'>
	readonly block: Expr<'battle'>
	readonly hand: Expr<'battle'>
	readonly handCards: Expr<'battle'>
	readonly hpPercent: Expr<'battle'>
	/** the unit's battle state, read-only */
	readonly state: Record<string, Expr<'battle'>>
}

export interface SelfPaths extends Omit<UnitPaths, 'state'> {
	/** own unit's battle state: read + inc/set */
	readonly state: Record<string, StateEntry<'battle'>>
}

function unitFields(root: 'self' | 'target') {
	const p = (f: string) => new Expr<'battle'>(`${root}.${f}`)
	return {
		hp: p('hp'),
		maxHp: p('max_hp'),
		block: p('block'),
		hand: p('hand'),
		handCards: p('hand_cards'),
		hpPercent: p('hp_percent'),
	}
}

export function selfPaths(): SelfPaths {
	return {
		...unitFields('self'),
		state: record(k => new StateEntry<'battle'>(`self.state.${k}`, 'unit', k)),
	}
}

export function targetPaths(): UnitPaths {
	return {
		...unitFields('target'),
		state: record(k => new Expr<'battle'>(`target.state.${k}`)),
	}
}

// --- battle and player ---

export interface BattlePaths {
	readonly turn: Expr<'battle'>
	readonly enemiesAlive: Expr<'battle'>
	readonly alliesAlive: Expr<'battle'>
}

export function battlePaths(): BattlePaths {
	return {
		turn: new Expr('battle.turn'),
		enemiesAlive: new Expr('battle.enemies_alive'),
		alliesAlive: new Expr('battle.allies_alive'),
	}
}

export interface PlayerPaths {
	readonly hp: Expr
	readonly maxHp: Expr
	readonly deckSize: Expr
	readonly deckTotal: Expr
	/** raw access to player state by full key ("ns:key") */
	readonly state: Record<string, Expr>
}

export function playerPaths(): PlayerPaths {
	return {
		hp: new Expr('player.hp'),
		maxHp: new Expr('player.max_hp'),
		deckSize: new Expr('player.deck_size'),
		deckTotal: new Expr('player.deck_total'),
		state: record(k => new Expr(`player.state.${k}`)),
	}
}

// --- the carrier card ---

export type ParamExprs<P extends Params> = { readonly [K in keyof P]: Expr<'card'> }
export type CardStateEntries<S extends Params> = { readonly [K in keyof S]: StateEntry<'card'> }

export interface CardPaths<P extends Params = Params, S extends Params = Params> {
	readonly stack: Expr<'card'>
	readonly cooldown: Expr<'card'>
	readonly modsTotal: Expr<'card'>
	readonly params: ParamExprs<P>
	/** run-scoped card state: read + inc/set */
	readonly state: CardStateEntries<S>
	/** battle-scoped card state (reset on battle entry) */
	readonly bstate: Record<string, StateEntry<'card'>>
	/** stack of a seal on the card: card.mods["ns:id"] */
	readonly mods: Record<string, Expr<'card'>>
}

export function cardPaths<P extends Params = Params, S extends Params = Params>(): CardPaths<P, S> {
	return {
		stack: new Expr('card.stack'),
		cooldown: new Expr('card.cooldown'),
		modsTotal: new Expr('card.mods_total'),
		params: record(k => new Expr<'card'>(`card.params.${k}`)) as ParamExprs<P>,
		state: record(k => new StateEntry<'card'>(`card.state.${k}`, 'card', k)) as CardStateEntries<S>,
		bstate: record(k => new StateEntry<'card'>(`card.bstate.${k}`, 'card_battle', k)),
		mods: record(k => new Expr<'card'>(`card.mods.${k}`)),
	}
}

// --- modifier ---

export interface ModPaths<MP extends Params = Params> {
	readonly stack: Expr<'mod'>
	readonly turns: Expr<'mod'>
	readonly params: { readonly [K in keyof MP]: Expr<'mod'> }
}

export function modPaths<MP extends Params = Params>(): ModPaths<MP> {
	return {
		stack: new Expr('mod.stack'),
		turns: new Expr('mod.turns'),
		params: record(k => new Expr<'mod'>(`mod.params.${k}`)) as ModPaths<MP>['params'],
	}
}

// --- event ---

export type EventExprs<P> = { readonly [K in keyof P]: Expr<'event'> } & {
	/** raw payload key as-is, without snake_case conversion */
	raw(key: string): Expr<'event'>
}

export function eventPaths<P>(): EventExprs<P> {
	const proxy = new Proxy(
		{
			raw: (key: string) => new Expr<'event'>(`event.${key}`),
		} as Record<string, unknown>,
		{
			get(target, prop) {
				if (typeof prop !== 'string') return undefined
				if (prop === 'raw') return target.raw
				return new Expr<'event'>(`event.${snakeKey(prop)}`)
			},
		},
	)
	return proxy as EventExprs<P>
}
