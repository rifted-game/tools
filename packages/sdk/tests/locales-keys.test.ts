import { buffKey, cardKey, encounterKey, enemyKey, locKey } from '../src/locales/keys'

describe('locales/keys', () => {
	test('card key with and without attribute', () => {
		expect(cardKey('my_mod:rage')).toBe('my_mod-card-rage')
		expect(cardKey('my_mod:rage', 'name')).toBe('my_mod-card-rage.name')
		expect(cardKey('my_mod:rage', 'description')).toBe('my_mod-card-rage.description')
		expect(cardKey('my_mod:rage', 'flavor')).toBe('my_mod-card-rage.flavor')
	})

	test('buff key requires explicit namespace', () => {
		expect(buffKey('my_mod', 'burning')).toBe('my_mod-buff-burning')
		expect(buffKey('my_mod', 'burning', 'description')).toBe('my_mod-buff-burning.description')
	})

	test('enemy key produces just the message id by default', () => {
		expect(enemyKey('my_mod:goblin')).toBe('my_mod-enemy-goblin')
		expect(enemyKey('my_mod:goblin', 'name')).toBe('my_mod-enemy-goblin.name')
	})

	test('encounter uses title/body attributes', () => {
		expect(encounterKey('my_mod:altar', 'title')).toBe('my_mod-encounter-altar.title')
		expect(encounterKey('my_mod:altar', 'body')).toBe('my_mod-encounter-altar.body')
	})

	test('locKey covers all kinds', () => {
		expect(locKey('card', 'x:y', 'name')).toBe('x-card-y.name')
		expect(locKey('match_mode', 'x:y', 'name')).toBe('x-mode-y.name')
		expect(locKey('location', 'ns:loc')).toBe('ns-location-loc')
	})

	test('locKey throws on non-namespaced id', () => {
		expect(() => locKey('card', 'no_colon')).toThrow()
	})
})
