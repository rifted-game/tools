import { describe, expect, test } from 'bun:test'

// trigger effect registration before any parse
import '../src/schema/effect'

import { Card } from '../src/builders/card'
import { File } from '../src/builders/file'
import { Dmg, Param } from '../src/helpers'

const BASE = {
	id: 'test:strike',
	affinity: 'neutral' as const,
	rarity: 'common' as const,
	baseCooldown: 3,
	scaleType: 'linear' as const,
	params: { base: 10 },
} satisfies Parameters<typeof Card>[0]

describe('Card builder', () => {
	test('minimal card passes validation', () => {
		const c = Card(BASE)
		expect(c.id).toBe('test:strike')
		expect(c.affinity).toBe('neutral')
		expect(c.base_cooldown).toBe(3)
		expect(c.scale_type).toBe('linear')
	})

	test('camelCase opts translate to snake_case fields', () => {
		const c = Card({
			...BASE,
			baseCooldown: 2,
			initialCharges: 3,
			consumeChargesOnPlay: true,
		})
		expect(c.base_cooldown).toBe(2)
		expect(c.initial_charges).toBe(3)
		expect(c.consume_charges_on_play).toBe(true)
	})

	test('card with on_play effect', () => {
		const c = Card({ ...BASE, onPlay: Dmg(Param('base')) })
		expect(c.on_play).toMatchObject({ do: 'damage', target: 'selected_enemy' })
	})

	test('modifier donor invariant — donor without as_modifier fails File validation', () => {
		const card = Card({ ...BASE, isModifierDonor: true })
		expect(() => File({ cards: [card] })).toThrow()
	})

	test('modifier donor invariant — as_modifier without donor flag fails File validation', () => {
		const card = Card({
			...BASE,
			asModifier: {
				trigger: 'host_played',
				listener: {
					on_event: 'on_play',
					effect: { do: 'gain_block', amount: { get: 'card.params.base' } },
				},
			},
		})
		expect(() => File({ cards: [card] })).toThrow()
	})

	test('modifier donor invariant — both present passes File validation', () => {
		const card = Card({
			...BASE,
			isModifierDonor: true,
			asModifier: {
				trigger: 'host_played',
				listener: {
					on_event: 'on_play',
					effect: { do: 'gain_block', amount: { get: 'card.params.base' } },
				},
			},
		})
		const f = File({ cards: [card] })
		expect(f.cards![0].is_modifier_donor).toBe(true)
	})
})

describe('File builder', () => {
	test('file with one card validates', () => {
		const f = File({ cards: [Card(BASE)] })
		expect(f.format_version).toBe(1)
		expect(f.cards).toHaveLength(1)
	})

	test('empty file (no content sections) throws', () => {
		expect(() => File({})).toThrow()
	})

	test('file with only cards validates (no buffs required)', () => {
		const f = File({ cards: [Card(BASE)] })
		expect(f.cards).toHaveLength(1)
		expect(f.buffs).toBeUndefined()
	})
})
