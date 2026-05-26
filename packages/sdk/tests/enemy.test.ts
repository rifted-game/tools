import { describe, expect } from 'bun:test'

import '../src/schema/effect'

import { Enemy } from '../src/builders/enemy'
import {
	ConditionalIntent,
	Intent,
	IntentPatternConditional,
	IntentPatternSequence,
} from '../src/builders/intent'
import { Dmg } from '../src/helpers'
import { Param } from '../src/helpers/value'
import { Enemy as EnemySchema } from '../src/schema/enemy'

// hp/maxHp use the Value DSL: number literal or { get: 'path' }

const baseIntent = Intent({
	kind: 'attack',
	description: 'Hits for 5',
	amount: 5,
	onExecute: Dmg({ get: 'card.params.base' }),
})

const BASE_FLAT = {
	id: 'test:goblin',
	name: 'Goblin',
	hp: 30,
	maxHp: 30,
	tags: [] as const,
	intentPattern: IntentPatternSequence([baseIntent]),
}

describe('Enemy builder — flat (intentPattern)', () => {
	test('flat enemy with sequence pattern', () => {
		const e = Enemy(BASE_FLAT as any)
		expect(e.id).toBe('test:goblin')
		expect(e.intent_pattern).toMatchObject({ kind: 'sequence' })
	})

	test('schema validates flat enemy', () => {
		const e = Enemy(BASE_FLAT as any)
		expect(() => EnemySchema.parse(e)).not.toThrow()
	})

	test('enemy snake_case field mapping', () => {
		const e = Enemy({ ...(BASE_FLAT as any), sfxAttack: 'res/audio/hit.wav' })
		expect(e.sfx_attack).toBe('res/audio/hit.wav')
		expect(e).not.toHaveProperty('sfxAttack')
	})
})

describe('Enemy builder — phased (boss)', () => {
	test('phased enemy with two phases validates', () => {
		// Phase schema requires id (BareId), intent_pattern, optional transition_condition/event
		const phase1 = {
			id: 'phase_1',
			intent_pattern: IntentPatternSequence([
				Intent({
					kind: 'attack',
					description: 'Smash',
					onExecute: Dmg(Param('atk')),
				}),
			]),
			transition_condition: {
				lt: [{ get: 'target.hp_percent' }, { get: 'card.params.threshold' }],
			},
		}
		const phase2 = {
			id: 'phase_2',
			intent_pattern: IntentPatternSequence([
				Intent({
					kind: 'attack',
					description: 'Rage Smash',
					amount: 15,
					onExecute: Dmg(15),
				}),
			]),
		}
		const e = Enemy({
			id: 'test:boss',
			name: 'Big Boss',
			hp: 200,
			maxHp: 200,
			tags: ['boss'],
			phases: [phase1, phase2],
		} as any)
		expect(e.phases).toHaveLength(2)
		expect(e).not.toHaveProperty('intent_pattern')
		expect(() => EnemySchema.parse(e)).not.toThrow()
	})
})

describe('Enemy schema — refine invariants', () => {
	test('enemy with both intentPattern and phases is invalid', () => {
		const raw = {
			id: 'test:bad',
			name: 'Bad',
			hp: 10,
			max_hp: 10,
			tags: [],
			intent_pattern: {
				kind: 'sequence',
				intents: [{ kind: 'attack', description: 'x' }],
			},
			phases: [
				{
					name: 'p1',
					intent_pattern: {
						kind: 'sequence',
						intents: [{ kind: 'attack', description: 'x' }],
					},
				},
				{
					name: 'p2',
					intent_pattern: {
						kind: 'sequence',
						intents: [{ kind: 'attack', description: 'x' }],
					},
				},
			],
		}
		expect(() => EnemySchema.parse(raw)).toThrow()
	})

	test('enemy with neither intentPattern nor phases is invalid', () => {
		const raw = {
			id: 'test:nopattern',
			name: 'No Pattern',
			hp: 10,
			max_hp: 10,
			tags: [],
		}
		expect(() => EnemySchema.parse(raw)).toThrow()
	})
})

describe('IntentPattern builders', () => {
	test('IntentPatternSequence produces kind:sequence', () => {
		const p = IntentPatternSequence([
			Intent({ kind: 'attack', description: 'Bite', onExecute: Dmg(4) }),
			Intent({ kind: 'defend', description: 'Curl up' }),
		])
		expect(p).toMatchObject({ kind: 'sequence' })
		expect((p as any).intents).toHaveLength(2)
	})

	test('IntentPatternConditional produces kind:conditional', () => {
		const p = IntentPatternConditional([
			ConditionalIntent({
				condition: {
					lt: [{ get: 'target.hp_percent' }, { get: 'card.params.threshold' }],
				},
				kind: 'attack',
				description: 'Rage',
				onExecute: Dmg(8),
			}),
		])
		expect(p).toMatchObject({ kind: 'conditional' })
	})
})
