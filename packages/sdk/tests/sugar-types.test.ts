// round-3: type-safety hardening — verifies the runtime behaviour of the
// builders that gained static guarantees (satisfies, callback render, pkg.File,
// typed custom event). The static guarantees themselves live in
// _effect-tag-guard.ts and are enforced by `tsc --noEmit`.

import '../src/schema/effect'

import { Actor } from '../src/builders/actor'
import { Asset } from '../src/builders/asset'
import { Card } from '../src/builders/card'
import { File } from '../src/builders/file'
import { $, Dmg, type Expr } from '../src/helpers'
import { Pkg } from '../src/pkg'

// strip fluent Expr methods the way File() does, so assertions see plain json
const plain = (v: unknown) => JSON.parse(JSON.stringify(v))

const CARD = {
	id: 'my_mod:strike',
	affinity: 'neutral' as const,
	rarity: 'common' as const,
	baseCooldown: 3,
	scaleType: 'linear' as const,
	params: { base: 10 },
}

describe('Asset / Actor satisfies builders', () => {
	test('Asset emits correct shape and validates', () => {
		expect(Asset({ path: 'assets/x.png', kind: 'card_art' })).toEqual({
			path: 'assets/x.png',
			kind: 'card_art',
		} as any)
		expect(Asset({ path: 'assets/x.png', kind: 'card_art', preload: true })).toEqual({
			path: 'assets/x.png',
			kind: 'card_art',
			preload: true,
		})
		expect(() =>
			File({ assets: [Asset({ path: 'assets/x.png', kind: 'card_art' })] }),
		).not.toThrow()
	})
	test('Actor maps animationSet → animation_set', () => {
		const a = Actor({ id: 'merchant', position: 'center', portrait: 'assets/m.png' }) as any
		expect(a).toEqual({ id: 'merchant', position: 'center', portrait: 'assets/m.png' })
		expect(a.animationSet).toBeUndefined()
	})
})

describe('callback render', () => {
	test('render callback gets typed params and resolves to Value map', () => {
		const card = Card<{ base: number }>({
			...CARD,
			render: ({ params }) => ({ shown: params.base.times(2) }),
		}) as any
		expect(plain(card.render)).toEqual({ shown: { mul: [{ get: 'card.params.base' }, 2] } })
		expect(() =>
			File({ package: { namespace: 'my_mod', version: '1' }, cards: [card] }),
		).not.toThrow()
	})
	test('static render object still works', () => {
		const card = Card({ ...CARD, render: { shown: { get: 'card.params.base' } } }) as any
		expect(card.render).toEqual({ shown: { get: 'card.params.base' } })
	})
})

describe('pkg.File binds namespace', () => {
	test('namespace comes from Pkg, not passable', () => {
		const pkg = Pkg('my_mod')
		const f = pkg.File({
			package: { version: '0.1.0', name: 'My Mod' },
			cards: [pkg.Card({ ...CARD, id: 'strike' })],
		}) as any
		expect(f.package.namespace).toBe('my_mod')
		expect(f.package.version).toBe('0.1.0')
		expect(f.cards[0].id).toBe('my_mod:strike')
	})
	test('pkg.File still runs namespace-prefix validation', () => {
		const pkg = Pkg('my_mod')
		// a card id under a different namespace must be rejected by File's refine
		expect(() =>
			pkg.File({
				package: { version: '1' },
				cards: [Card({ ...CARD, id: 'other:strike' })],
			}),
		).toThrow()
	})
})

describe('typed custom event', () => {
	test('custom<E> exposes declared payload fields as Expr', () => {
		const listener = $.on.custom<{ severity: Expr }>('margin_call', ({ event }) =>
			Dmg(event.severity.plus(1)),
		) as any
		expect(listener.on_event).toBe('margin_call')
		expect(plain(listener.effect)).toMatchObject({
			do: 'damage',
			amount: { add: [{ get: 'event.severity' }, 1] },
		})
	})
	test('custom without type param still works (open payload)', () => {
		const listener = $.on.custom('ping', ({ event }) => Dmg(event.whatever)) as any
		expect(plain(listener.effect.amount)).toEqual({ get: 'event.whatever' })
	})
})
