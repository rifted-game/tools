import { describe, expect, test } from 'bun:test'
import { z } from 'zod'

// ensure all schemas are registered before running
import '../src/schema/effect'

import { Condition } from '../src/schema/condition'
import { Effect } from '../src/schema/effect'
import { File } from '../src/schema/file'
import { BareId, NamespacedId } from '../src/schema/primitives'
import { Value } from '../src/schema/value'

// value DSL: key-based, not op-based
// { get: 'path' }, { add: [v1, v2] }, { scale: v }, { if: c, then: v, else: v }

// condition DSL: key-based
// { lt: [v1, v2] }, { and: [c1, c2] }, { not: c }

describe('NamespacedId', () => {
	test('valid ids', () => {
		for (const id of ['core:strike', 'my_mod:big_boss', 'a1:b2']) {
			expect(() => NamespacedId.parse(id)).not.toThrow()
		}
	})

	test('invalid ids', () => {
		for (const id of ['strike', ':strike', 'core:', 'Core:Strike', 'core:Strike', '']) {
			expect(() => NamespacedId.parse(id)).toThrow()
		}
	})
})

describe('BareId', () => {
	test('valid', () => {
		for (const id of ['idle', 'on_attack', 'clip1']) {
			expect(() => BareId.parse(id)).not.toThrow()
		}
	})

	test('invalid — uppercase or colon', () => {
		expect(() => BareId.parse('Idle')).toThrow()
		expect(() => BareId.parse('core:idle')).toThrow()
	})
})

describe('Value schema', () => {
	test('number literal', () => {
		expect(() => Value.parse(10)).not.toThrow()
		expect(() => Value.parse(0)).not.toThrow()
	})

	test('get path', () => {
		expect(() => Value.parse({ get: 'card.params.base' })).not.toThrow()
		expect(() => Value.parse({ get: 'player.hp' })).not.toThrow()
	})

	test('formula string', () => {
		expect(() => Value.parse({ formula: 'floor(x / 2)' })).not.toThrow()
	})

	test('scale wrapper', () => {
		expect(() => Value.parse({ scale: { get: 'card.params.base' } })).not.toThrow()
	})

	test('arithmetic operators', () => {
		const v1: unknown = { get: 'card.params.x' }
		const v2: unknown = 5
		expect(() => Value.parse({ add: [v1, v2] })).not.toThrow()
		expect(() => Value.parse({ sub: [v1, v2] })).not.toThrow()
		expect(() => Value.parse({ mul: [v1, v2] })).not.toThrow()
		expect(() => Value.parse({ div: [v1, v2] })).not.toThrow()
		expect(() => Value.parse({ min: [v1, v2] })).not.toThrow()
		expect(() => Value.parse({ max: [v1, v2] })).not.toThrow()
	})

	test('nested value expression', () => {
		expect(() =>
			Value.parse({
				add: [{ mul: [{ get: 'card.params.x' }, 2] }, { get: 'card.params.bonus' }],
			}),
		).not.toThrow()
	})
})

describe('Condition schema', () => {
	const v1 = { get: 'player.hp' }
	const v2 = { get: 'card.params.threshold' }

	test('comparison operators', () => {
		for (const op of ['lt', 'gt', 'lte', 'gte', 'eq', 'neq'] as const) {
			expect(() => Condition.parse({ [op]: [v1, v2] })).not.toThrow()
		}
	})

	test('formula condition', () => {
		expect(() => Condition.parse({ formula: 'player.hp < 10' })).not.toThrow()
	})

	test('and / or', () => {
		const c1 = { lt: [v1, v2] }
		expect(() => Condition.parse({ and: [c1, c1] })).not.toThrow()
		expect(() => Condition.parse({ or: [c1, c1] })).not.toThrow()
	})

	test('not', () => {
		const c1 = { lt: [v1, v2] }
		expect(() => Condition.parse({ not: c1 })).not.toThrow()
	})

	test('nested condition', () => {
		const c1 = { lt: [v1, v2] }
		expect(() =>
			Condition.parse({
				and: [{ not: c1 }, { gt: [v2, v1] }],
			}),
		).not.toThrow()
	})
})

describe('Effect discriminated union', () => {
	test('battle effects parse', () => {
		expect(() =>
			Effect.parse({
				do: 'damage',
				target: 'selected_enemy',
				amount: { get: 'card.params.base' },
			}),
		).not.toThrow()
		expect(() => Effect.parse({ do: 'gain_block', amount: 5 })).not.toThrow()
		expect(() =>
			Effect.parse({ do: 'self_damage', amount: { get: 'card.params.dmg' } }),
		).not.toThrow()
	})

	test('run effects parse', () => {
		expect(() => Effect.parse({ do: 'heal', amount: { get: 'card.params.heal' } })).not.toThrow()
		expect(() => Effect.parse({ do: 'add_coins', amount: 1 })).not.toThrow()
	})

	test('presentation effects parse', () => {
		expect(() => Effect.parse({ do: 'emit_event', event: 'on_turn_start' })).not.toThrow()
		expect(() => Effect.parse({ do: 'wait_for_input' })).not.toThrow()
	})

	test('sequence with one effect', () => {
		expect(() =>
			Effect.parse({
				do: 'sequence',
				effects: [{ do: 'damage', target: 'selected_enemy', amount: 5 }],
			}),
		).not.toThrow()
	})
})

describe('File schema', () => {
	test('minimal valid file', () => {
		const f = {
			format_version: 1,
			cards: [
				{
					id: 'test:x',
					affinity: 'neutral',
					rarity: 'common',
					base_cooldown: 3,
					scale_type: 'linear',
					params: { base: 10 },
				},
			],
		}
		expect(() => File.parse(f)).not.toThrow()
	})

	test('file without content sections fails', () => {
		expect(() => File.parse({ format_version: 1 })).toThrow()
	})

	test('z.toJSONSchema does not throw', () => {
		expect(() => z.toJSONSchema(File)).not.toThrow()
	})

	test('JSON schema output is an object', () => {
		const schema = z.toJSONSchema(File)
		expect(typeof schema).toBe('object')
		expect(schema).toHaveProperty('type')
	})
})
