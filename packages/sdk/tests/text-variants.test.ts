// ensure dsl-lazy registrations happen before parse
import '../src/schema/dsl-lazy'
import '../src/schema/value'
import '../src/schema/condition'

import { Loc, TextRandom, TextVariants } from '../src/builders/text-variants'
import { TextWithVariants } from '../src/schema/text-variants'

// condition DSL: key-based — { lt: [v1, v2] }, { and: [c1, c2] }, { not: c }
// NOT { op: 'lt', left: ..., right: ... }

describe('TextWithVariants schema — plain text forms', () => {
	test('plain string', () => {
		expect(() => TextWithVariants.parse('Hello')).not.toThrow()
	})

	test('lang map', () => {
		expect(() => TextWithVariants.parse({ en: 'Hello', ru: 'Привет' })).not.toThrow()
	})

	test('localisation key object', () => {
		expect(() => TextWithVariants.parse({ key: 'ui.hello' })).not.toThrow()
	})
})

describe('TextVariants builder', () => {
	test('single unconditional variant', () => {
		const t = TextVariants([{ text: 'Hello' }])
		expect(t).toMatchObject({ variants: [{ text: 'Hello' }] })
		expect(() => TextWithVariants.parse(t)).not.toThrow()
	})

	test('variant with condition (key-based DSL)', () => {
		const t = TextVariants([
			{
				condition: {
					lt: [{ get: 'player.hp_percent' }, { get: 'card.params.threshold' }],
				},
				text: 'Running low...',
			},
			{ text: 'All good.' },
		])
		expect(() => TextWithVariants.parse(t)).not.toThrow()
	})
})

describe('TextRandom builder', () => {
	test('pool of strings', () => {
		const t = TextRandom(['Hello!', 'Greetings!', 'Hey there!'])
		expect(t).toMatchObject({ random: ['Hello!', 'Greetings!', 'Hey there!'] })
		expect(() => TextWithVariants.parse(t)).not.toThrow()
	})

	test('pool of nested variants', () => {
		const t = TextRandom([TextVariants([{ text: 'A' }]), 'B'])
		expect(() => TextWithVariants.parse(t)).not.toThrow()
	})
})

describe('Loc builder', () => {
	test('produces key object', () => {
		const t = Loc('card.strike.description')
		expect(t).toEqual({ key: 'card.strike.description' })
		expect(() => TextWithVariants.parse(t)).not.toThrow()
	})
})

describe('recursive text', () => {
	test('variants containing random pools', () => {
		const t = TextVariants([
			{
				condition: {
					lt: [{ get: 'battle.turn' }, { get: 'card.params.limit' }],
				},
				text: TextRandom(['Early!', 'Still early.']),
			},
			{ text: 'Later.' },
		])
		expect(() => TextWithVariants.parse(t)).not.toThrow()
	})
})
