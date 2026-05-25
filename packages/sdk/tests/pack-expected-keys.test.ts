import { describe, expect, test } from 'bun:test'

import { expectedKeysFromGcf } from '../src/pack/expected-keys'

describe('pack/expected-keys', () => {
	test('card without name/description requires both keys', () => {
		const { required } = expectedKeysFromGcf({
			package: { namespace: 'my_mod' },
			cards: [{ id: 'my_mod:rage' }],
		})
		expect(required.has('my_mod-card-rage.name')).toBe(true)
		expect(required.has('my_mod-card-rage.description')).toBe(true)
	})

	test('card with explicit name does not require the name key', () => {
		const { required } = expectedKeysFromGcf({
			package: { namespace: 'my_mod' },
			cards: [{ id: 'my_mod:rage', name: 'Rage' }],
		})
		expect(required.has('my_mod-card-rage.name')).toBe(false)
		expect(required.has('my_mod-card-rage.description')).toBe(true)
	})

	test('encounter title/body land in optional, not required', () => {
		const { required, optional } = expectedKeysFromGcf({
			package: { namespace: 'my_mod' },
			encounters: [{ id: 'my_mod:altar' }],
		})
		expect(required.size).toBe(0)
		expect(optional.has('my_mod-encounter-altar.title')).toBe(true)
		expect(optional.has('my_mod-encounter-altar.body')).toBe(true)
	})

	test('match_mode name is required, description is optional', () => {
		const { required, optional } = expectedKeysFromGcf({
			package: { namespace: 'my_mod' },
			match_modes: [{ id: 'my_mod:duo' }],
		})
		expect(required.has('my_mod-mode-duo.name')).toBe(true)
		expect(optional.has('my_mod-mode-duo.description')).toBe(true)
	})

	test('buff uses namespace from package', () => {
		const { required } = expectedKeysFromGcf({
			package: { namespace: 'my_mod' },
			buffs: [{ id: 'bleed' }],
		})
		expect(required.has('my_mod-buff-bleed.name')).toBe(true)
		expect(required.has('my_mod-buff-bleed.description')).toBe(true)
	})
})
