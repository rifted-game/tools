// round-2 sugar: bare-number/randInt state init, initial_run_state, intents fix.

import '../src/schema/effect'

import { Buff } from '../src/builders/buff'
import { Card } from '../src/builders/card'
import { Enemy } from '../src/builders/enemy'
import { File } from '../src/builders/file'
import { $, intents, randInt } from '../src/helpers'
import { Pkg } from '../src/pkg'

const CARD = {
	id: 'test:strike',
	affinity: 'neutral' as const,
	rarity: 'common' as const,
	baseCooldown: 3,
	scaleType: 'linear' as const,
	params: { base: 10 },
}

describe('initialState bare number → const', () => {
	test('card: bare numbers normalize to { const }', () => {
		const card = Card({ ...CARD, initialState: { charge: 0, power: 5 } }) as any
		expect(card.initial_state).toEqual({ charge: { const: 0 }, power: { const: 5 } })
		expect(() => File({ cards: [card] })).not.toThrow()
	})
	test('card: randInt → { random_int }', () => {
		const card = Card({ ...CARD, initialState: { mood: randInt(1, 3) } }) as any
		expect(card.initial_state).toEqual({ mood: { random_int: { min: 1, max: 3 } } })
		expect(() => File({ cards: [card] })).not.toThrow()
	})
	test('card: full object form with decay still passes through', () => {
		const card = Card({
			...CARD,
			initialState: { rage: { const: 5, decay: { on_event: 'turn_end', amount: 1, min: 0 } } },
		}) as any
		expect(card.initial_state.rage).toMatchObject({
			const: 5,
			decay: { on_event: 'turn_end', amount: 1 },
		})
		expect(() => File({ cards: [card] })).not.toThrow()
	})
	test('mixed bare + randInt in one card', () => {
		const card = Card({ ...CARD, initialState: { charge: 0, mood: randInt(2, 4) } }) as any
		expect(card.initial_state).toEqual({
			charge: { const: 0 },
			mood: { random_int: { min: 2, max: 4 } },
		})
	})
	test('buff: bare number + randInt normalize', () => {
		const buff = Buff({
			id: 'burning',
			icon: 'x',
			color: '#ff0000',
			showStacks: true,
			showDuration: true,
			kind: 'debuff',
			initialState: { power: 3, jitter: randInt(0, 2) },
		}) as any
		expect(buff.initial_state).toEqual({
			power: { const: 3 },
			jitter: { random_int: { min: 0, max: 2 } },
		})
		expect(() => File({ buffs: [buff] })).not.toThrow()
	})
})

describe('autovivify typed state from initialState', () => {
	test('self.add/self.set work without an explicit second generic', () => {
		// no generics: S is inferred from initialState keys, so self.set('debt') is typed
		const card = Card({
			...CARD,
			initialState: { debt: 0 },
			onPlay: ({ self }) => self.set('debt', 0),
			passiveListeners: ({ self }) =>
				$.on.damageDealt(({ event }) => self.add('debt', event.amount)),
		}) as any
		expect(card.on_play).toMatchObject({ do: 'set_card_state', key: 'debt', value: 0 })
		expect(card.passive_listeners[0].effect).toMatchObject({
			do: 'add_card_state',
			key: 'debt',
		})
		expect(() => File({ cards: [card] })).not.toThrow()
	})
})

describe('randInt validation', () => {
	test('rejects non-integer bounds', () => {
		expect(() => randInt(1.5, 3)).toThrow()
	})
	test('rejects min > max', () => {
		expect(() => randInt(5, 1)).toThrow()
	})
})

describe('initial_run_state on File + pkg helper', () => {
	test('File emits initial_run_state for namespaced keys', () => {
		const f = File({
			package: { namespace: 'my_mod', version: '0.1.0' },
			cards: [Card({ ...CARD, id: 'my_mod:strike' })],
			initialRunState: { 'my_mod:curse_charge': 5 },
		}) as any
		expect(f.initial_run_state).toEqual({ 'my_mod:curse_charge': 5 })
	})
	test('pkg.initialRunState namespaces keys', () => {
		const pkg = Pkg('my_mod', { state: ['curse_charge', 'rage'] })
		expect(pkg.initialRunState({ curse_charge: 5 })).toEqual({ 'my_mod:curse_charge': 5 })
	})
	test('File rejects a bare (non-namespaced) run-state key', () => {
		expect(() =>
			File({
				cards: [Card({ ...CARD })],
				initialRunState: { curse_charge: 5 } as any,
			}),
		).toThrow()
	})
})

describe('intents.* wire on_execute (no more dead intents)', () => {
	test('aggressor attack carries on_execute damage', () => {
		const e = Enemy({
			id: 'test:goblin',
			hp: 10,
			maxHp: 10,
			tags: ['aggressive'],
			intentPattern: intents.aggressor(6),
		}) as any
		const atk = e.intent_pattern.intents[0]
		expect(atk.amount).toBe(6)
		expect(atk.on_execute).toMatchObject({ do: 'damage', amount: 6 })
		expect(() => File({ enemies: [e] })).not.toThrow()
	})
	test('alternating wires both attack damage and defend block', () => {
		const p = intents.alternating(5, 4) as any
		expect(p.intents[0].on_execute).toMatchObject({ do: 'damage', amount: 5 })
		expect(p.intents[1].on_execute).toMatchObject({ do: 'gain_block', amount: 4 })
	})
	test('charger final hit and opportunist branches carry on_execute', () => {
		const c = intents.charger(2, 12) as any
		expect(c.intents.at(-1).on_execute).toMatchObject({ do: 'damage', amount: 12 })
		const o = intents.opportunist(6, 20) as any
		expect(o.intents[0].on_execute).toMatchObject({ do: 'damage', amount: 20 })
		expect(o.intents[1].on_execute).toMatchObject({ do: 'damage', amount: 6 })
	})
})
