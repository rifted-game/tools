// verifies the syntactic-sugar layer produces valid, well-shaped json.
// every entity is run through File() so zod validation is exercised end to end.

import '../src/schema/effect'

import { sprites } from '../src/builders/animation'
import { Card } from '../src/builders/card'
import { Choice } from '../src/builders/choice'
import { AddBaseDamage, MultiplyDamage, OverrideScale } from '../src/builders/effect/battle'
import { Foreach, If, Let, Repeat, TriggerAfter } from '../src/builders/effect/composite'
import { Encounter } from '../src/builders/encounter'
import { Enemy } from '../src/builders/enemy'
import { File } from '../src/builders/file'
import { ConditionalIntent } from '../src/builders/intent'
import { Location } from '../src/builders/location'
import { MatchMode, win } from '../src/builders/match-mode'
import { Phase } from '../src/builders/phase'
import { Summon } from '../src/builders/summon'
import { $, Block, Dmg, intent, onEnemyDeath, onTurn, range } from '../src/helpers'
import { Pkg } from '../src/pkg'

const CARD = {
	id: 'test:strike',
	affinity: 'neutral' as const,
	rarity: 'common' as const,
	baseCooldown: 3,
	scaleType: 'linear' as const,
	params: { base: 10 },
}

// ============================= TIER 1 =====================================

describe('range', () => {
	test('inclusive ascending', () => {
		expect(range(1, 6)).toEqual([1, 2, 3, 4, 5, 6])
	})
	test('single element', () => {
		expect(range(4, 4)).toEqual([4])
	})
	test('descending', () => {
		expect(range(3, 1)).toEqual([3, 2, 1])
	})
})

describe('wrapEffect single-array unwrap', () => {
	test('single-element array does not wrap in sequence', () => {
		const eff = If({ condition: $.player.hp.gt(0), then: [Dmg(5)] }) as any
		expect(eff.then.do).toBe('damage')
	})
	test('multi-element array wraps in sequence', () => {
		const eff = If({ condition: $.player.hp.gt(0), then: [Dmg(5), Block(3)] }) as any
		expect(eff.then.do).toBe('sequence')
		expect(eff.then.effects).toHaveLength(2)
	})
})

describe('nested effects accept arrays', () => {
	test('Repeat / If / TriggerAfter accept Effect[]', () => {
		const card = Card({
			...CARD,
			onPlay: [
				Repeat({ count: 2, effect: [Dmg(3), Block(1)] }),
				If({ condition: $.player.hp.gt(10), then: [Dmg(5)], else: [Block(2)] }),
				TriggerAfter({ turns: 2, effect: [Dmg(8)] }),
			],
		})
		expect(() => File({ cards: [card] })).not.toThrow()
	})
})

describe('Let callback form', () => {
	test('typed refs resolve to let.<name>', () => {
		const eff = Let({ released: $.card.state.debt.times(2) }, ({ released }) =>
			Dmg(released),
		) as any
		expect(eff.do).toBe('let')
		expect(eff.bindings.released).toMatchObject({ mul: [{ get: 'card.state.debt' }, 2] })
		expect(eff.in).toMatchObject({ do: 'damage', amount: { get: 'let.released' } })
	})
	test('object form still works', () => {
		const eff = Let({ bindings: { x: 5 }, in: Dmg({ get: 'let.x' }) }) as any
		expect(eff.bindings.x).toBe(5)
	})
})

describe('damage modifier helpers', () => {
	test('named helpers produce add_damage_modifier with right kind', () => {
		expect(AddBaseDamage(5)).toMatchObject({
			do: 'add_damage_modifier',
			modifier: { kind: 'add_to_base', value: 5 },
		})
		expect(MultiplyDamage(2)).toMatchObject({ modifier: { kind: 'multiply_final', value: 2 } })
		expect(OverrideScale(9)).toMatchObject({ modifier: { kind: 'override_scale', value: 9 } })
	})
})

describe('intent singular helpers', () => {
	test('attack telegraphs amount and wires on_execute damage', () => {
		const i = intent.attack(12, 'Strike') as any
		expect(i.kind).toBe('attack')
		expect(i.amount).toBe(12)
		expect(i.on_execute).toMatchObject({ do: 'damage', amount: 12 })
	})
	test('defend grants block; charge is pure telegraph', () => {
		expect((intent.defend(8) as any).on_execute).toMatchObject({ do: 'gain_block', amount: 8 })
		expect((intent.charge() as any).on_execute).toBeUndefined()
	})
})

describe('intent pattern as array', () => {
	test('plain intents infer sequence pattern', () => {
		const e = Enemy({
			id: 'test:goblin',
			hp: 20,
			maxHp: 20,
			tags: ['aggressive'],
			intentPattern: [intent.attack(6, 'Hit'), intent.charge()],
		}) as any
		expect(e.intent_pattern.kind).toBe('sequence')
		expect(e.intent_pattern.intents).toHaveLength(2)
		expect(() => File({ enemies: [e] })).not.toThrow()
	})
	test('conditional intents infer conditional pattern', () => {
		const p = Phase({
			id: 'rage',
			intentPattern: [
				ConditionalIntent({
					condition: $.self.hpPercent.lt(50),
					kind: 'attack',
					description: 'Frenzy',
					amount: 20,
					onExecute: Dmg(20),
				}),
				ConditionalIntent({
					condition: { formula: 'true' },
					kind: 'attack',
					description: 'Swipe',
					amount: 8,
					onExecute: Dmg(8),
				}),
			],
		}) as any
		expect(p.intent_pattern.kind).toBe('conditional')
	})
	test('mixing plain and conditional intents throws', () => {
		expect(() =>
			Summon({
				id: 'test:spirit',
				hp: 10,
				maxHp: 10,
				tags: ['summon'],
				intentPattern: [
					intent.attack(3),
					ConditionalIntent({ condition: { formula: 'true' }, kind: 'attack', description: 'x' }),
				] as any,
			}),
		).toThrow()
	})
})

describe('reveal + charges sugar', () => {
	test('revealOn sets reveal_triggers and hidden_until_revealed', () => {
		const card = Card({ ...CARD, revealOn: [onTurn(5), onEnemyDeath()] }) as any
		expect(card.hidden_until_revealed).toBe(true)
		expect(card.reveal_triggers).toEqual([{ kind: 'turn_n', threshold: 5 }, { kind: 'enemy_died' }])
		expect(() => File({ cards: [card] })).not.toThrow()
	})
	test('charges group maps to flat fields', () => {
		const card = Card({ ...CARD, charges: { initial: 3, consumeOnPlay: true } }) as any
		expect(card.initial_charges).toBe(3)
		expect(card.consume_charges_on_play).toBe(true)
	})
})

// ============================= TIER 2 =====================================

describe('Card<P,S> typed state', () => {
	test('self.add/self.set emit card-state effects without target', () => {
		const card = Card<{ base: number }, { debt: number }>({
			...CARD,
			initialState: { debt: 0 },
			passiveListeners: ({ self }) =>
				$.on.damageDealt(({ event }) => self.add('debt', event.amount)),
			onPlay: ({ self }) => self.set('debt', 0),
		}) as any
		expect(card.on_play).toMatchObject({ do: 'set_card_state', key: 'debt', value: 0 })
		expect(card.on_play.target).toBeUndefined()
		expect(card.passive_listeners[0].effect).toMatchObject({
			do: 'add_card_state',
			key: 'debt',
			value: { get: 'event.amount' },
		})
		expect(() => File({ cards: [card] })).not.toThrow()
	})
})

describe('Pkg state registry', () => {
	const pkg = Pkg('my_mod', { state: ['rage', 'echoes'] })
	test('key applies namespace', () => {
		expect(pkg.key('rage')).toBe('my_mod:rage')
	})
	test('state.set/add/read build namespaced effects/exprs', () => {
		expect(pkg.state.set('rage', 1)).toMatchObject({
			do: 'set_run_state',
			key: 'my_mod:rage',
			value: 1,
		})
		expect(pkg.state.add('rage', 2)).toMatchObject({ do: 'add_run_state', key: 'my_mod:rage' })
		expect(pkg.state.read('echoes')).toMatchObject({ get: 'run.state.my_mod:echoes' })
	})
	test('pkg.id prefixes entity ids; pkg.Card keeps typed params', () => {
		const c = pkg.Card<{ base: number }>({
			id: 'strike',
			affinity: 'neutral',
			rarity: 'common',
			baseCooldown: 1,
			scaleType: 'flat',
			params: { base: 4 },
			onPlay: ({ params }) => Dmg(params.base.scaled()),
		})
		expect(c.id).toBe('my_mod:strike')
	})
})

describe('$ state readers (callable + namespaced)', () => {
	test('run.state(key) handles namespaced colon keys', () => {
		expect($.run.state('my_mod:rage')).toMatchObject({ get: 'run.state.my_mod:rage' })
		expect($.run.state('my_mod:rage').plus(1)).toMatchObject({
			add: [{ get: 'run.state.my_mod:rage' }, 1],
		})
	})
	test('encounter.state(key) reads encounter state', () => {
		expect($.encounter.state('harvested')).toMatchObject({ get: 'encounter.state.harvested' })
	})
	test('property access still works for bare keys', () => {
		expect($.run.state.floorflag).toMatchObject({ get: 'run.state.floorflag' })
	})
})

describe('Location plain objects + shorthand', () => {
	test('map shorthand and guaranteed/tethers normalize to snake_case', () => {
		const loc = Location({
			id: 'my_mod:depths',
			act: 2,
			map: {
				floors: 12,
				width: 4,
				paths: [2, 4],
				nodeWeights: { combat: 10, elite: 3 },
				guaranteed: { 6: 'shop', 12: 'boss' },
				tethers: { chance: 0.3 },
			},
			visuals: [{ floors: range(1, 6), layers: [{ asset: 'assets/bg/a.png', scrollRate: 0.2 }] }],
			spawnTable: { combat: [{ id: 'my_mod:rat', weight: 10, maxFloor: 6 }], boss: 'my_mod:king' },
		}) as any
		expect(loc.map.paths_min).toBe(2)
		expect(loc.map.paths_max).toBe(4)
		expect(loc.map.pairwise_tether_chance).toBe(0.3)
		expect(loc.map.guaranteed_nodes).toEqual([
			{ floor: 6, kind: 'shop' },
			{ floor: 12, kind: 'boss' },
		])
		expect(loc.visuals[0].floors).toEqual([1, 2, 3, 4, 5, 6])
		expect(loc.visuals[0].layers[0].scroll_rate).toBe(0.2)
		expect(loc.spawn_table.combat[0].max_floor).toBe(6)
		expect(() => File({ locations: [loc] })).not.toThrow()
	})
})

describe('MatchMode objects + win helpers', () => {
	test('teams object, acts object, win spec normalize', () => {
		const mode = MatchMode({
			id: 'my_mod:duel',
			teams: {
				red: { size: 1, kind: 'human' },
				blue: { size: [1, 3], kind: 'ai' },
			},
			winCondition: win.surviveTurns(10),
			acts: { 1: ['my_mod:depths'], 2: ['my_mod:abyss'] },
			combatMode: 'blind_commit',
		}) as any
		expect(mode.teams[0]).toMatchObject({ id: 'red', min_size: 1, max_size: 1, kind: 'human' })
		expect(mode.teams[1]).toMatchObject({ id: 'blue', min_size: 1, max_size: 3 })
		expect(mode.win_condition).toBe('survive_n_turns')
		expect(mode.win_params).toEqual({ turns: 10 })
		expect(mode.act_sequence).toEqual([
			{ act: 1, location_pool: ['my_mod:depths'] },
			{ act: 2, location_pool: ['my_mod:abyss'] },
		])
		expect(mode.combat_mode).toBe('blind_commit')
		expect(() => File({ matchModes: [mode] })).not.toThrow()
	})
})

describe('sprites() animation', () => {
	test('clips carry their own trigger via on', () => {
		const anim = sprites('assets/chars/goblin.png', [64, 64], {
			idle: { frames: range(0, 3), fps: 6, loop: true, on: 'idle' },
			attack: { frames: range(4, 6), fps: 12, on: ['attack', 'curse'] },
			hurt: { frames: [7, 8], fps: 10 },
		})
		expect(anim.kind).toBe('sprite_sheet')
		expect((anim as any).clips.idle).toEqual({ frames: [0, 1, 2, 3], fps: 6, loop: true })
		expect((anim as any).triggers).toEqual({
			on_idle: 'idle',
			on_attack: 'attack',
			on_curse: 'attack',
		})
	})
})

// ============================= TIER 3 =====================================

describe('Foreach callback form', () => {
	test('item fields map to target.*; binding name generated', () => {
		const eff = Foreach('all_enemies', e => Dmg(e.hp.times(0.1))) as any
		expect(eff.do).toBe('foreach')
		expect(eff.targets).toBe('all_enemies')
		expect(typeof eff.as).toBe('string')
		expect(eff.effect).toMatchObject({
			do: 'damage',
			amount: { mul: [{ get: 'target.hp' }, 0.1] },
		})
	})
	test('item.id resolves to let.<as>', () => {
		const eff = Foreach('all_enemies', e => Dmg(e.id)) as any
		expect(eff.effect.amount.get).toBe(`let.${eff.as}`)
	})
	test('callback can return an array of effects', () => {
		const eff = Foreach('all_enemies', e => [Dmg(e.hp.times(0.1)), Block(1)]) as any
		expect(eff.effect.do).toBe('sequence')
		expect(eff.effect.effects).toHaveLength(2)
	})
	test('object form still works', () => {
		const eff = Foreach({ targets: 'all_enemies', as: 'e', effect: Dmg(1) }) as any
		expect(eff.as).toBe('e')
	})
})

describe('Encounter scene', () => {
	test('actors object + scene speakers produce timed steps', () => {
		const enc = Encounter({
			id: 'test:trickster',
			actors: { merchant: { position: 'center', portrait: 'assets/actors/m.png' } },
			scene: ({ merchant }) => ({
				intro: [merchant.clip('wave').then(0.5), merchant.say('Hi'), merchant.choices()],
				choices: [Choice({ label: 'ok', effect: [Dmg(1)] })],
				outro: [merchant.moveTo('far_left', 1).then(0.5), merchant.close()],
			}),
		}) as any
		expect(enc.actors[0]).toMatchObject({ id: 'merchant', position: 'center' })
		expect(enc.intro[0]).toMatchObject({ do: 'play_clip', actor: 'merchant', clip: 'wave' })
		expect(enc.intro[1]).toMatchObject({ do: 'wait', duration: 0.5 })
		expect(enc.intro[2]).toMatchObject({ do: 'say', actor: 'merchant' })
		expect(enc.intro[3]).toMatchObject({ do: 'show_choices' })
		expect(enc.outro[0]).toMatchObject({ do: 'set_actor_position', actor: 'merchant' })
		expect(enc.outro[2]).toMatchObject({ do: 'close_encounter' })
		expect(() => File({ encounters: [enc] })).not.toThrow()
	})
	test('back-compat: actors array + intro field without scene', () => {
		const enc = Encounter({
			id: 'test:plain',
			actors: [{ id: 'guard', position: 'right' }],
			intro: [{ do: 'say', actor: 'guard', text: 'Halt' } as any],
		}) as any
		expect(enc.actors[0].id).toBe('guard')
		expect(enc.intro[0].do).toBe('say')
		expect(() => File({ encounters: [enc] })).not.toThrow()
	})
})
