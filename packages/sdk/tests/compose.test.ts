// Multi-file composition: grammY-style content() composers mounted with
// use(), refs traveling as plain exports, function-style modules

import { expect, test } from 'bun:test'
import { content, defineContent, dmg, intent, Pkg, phase } from '../src/index'

test('files declare into local composers; the entry mounts them in order', () => {
	// src/content/cards/attack.ts
	const attack = content()
	const slash = attack.card('slash', { onPlay: () => dmg('selected', 3) })

	// src/content/cards/defense.ts
	const defense = content()
	const ward = defense.card('ward', { onPlay: () => dmg('selected', 1) })

	// src/content/cards/index.ts — the folder aggregator is itself a composer
	const cards = content()
	cards.use(attack, defense)

	// src/content/world.ts
	const world = content()
	const goblin = world.enemy('goblin', {
		hp: 16,
		phases: [phase({ steps: [intent.attack(4)] })],
	})
	// refs are plain exports — usable across files via normal imports
	world.encounter('fight', { enemies: [goblin], loot: { pool: [slash], offer: 1, picks: 1 } })

	// src/index.ts
	const pkg = Pkg('m')
	pkg.use(cards, world)

	const doc = pkg.build() as Record<string, Array<{ id: string }>>
	expect(doc.cards.map(c => c.id)).toEqual(['slash', 'ward'])
	expect(doc.enemies.map(e => e.id)).toEqual(['goblin'])
	expect(doc.encounters[0]).toMatchObject({ enemies: ['goblin'], loot: ['slash'] })
	expect(ward.id).toBe('ward')
})

test('document order = mount order, not import/declaration order', () => {
	const a = content()
	const b = content()
	a.card('a', { onPlay: () => dmg('selected', 1) })
	b.card('b', { onPlay: () => dmg('selected', 1) })
	const pkg = Pkg('m')
	pkg.use(b)
	pkg.use(a)
	const doc = pkg.build() as { cards: Array<{ id: string }> }
	expect(doc.cards.map(c => c.id)).toEqual(['b', 'a'])
})

test('mounting is live: definitions added after use() still land', () => {
	const late = content()
	const pkg = Pkg('m')
	pkg.use(late)
	late.card('afterthought', { onPlay: () => dmg('selected', 1) })
	const doc = pkg.build() as { cards: Array<{ id: string }> }
	expect(doc.cards.map(c => c.id)).toEqual(['afterthought'])
})

test('a composer mounted twice is a build error', () => {
	const shared = content()
	shared.card('x', { onPlay: () => dmg('selected', 1) })
	const a = content()
	const b = content()
	a.use(shared)
	b.use(shared)
	const pkg = Pkg('m')
	pkg.use(a, b)
	expect(() => pkg.build()).toThrow(/mounted more than once/)
})

test('self-mount is rejected immediately', () => {
	const c = content()
	expect(() => c.use(c)).toThrow(/into itself/)
})

test('a forgotten use() fails the build at the dangling reference', () => {
	const cards = content()
	const slash = cards.card('slash', { onPlay: () => dmg('selected', 3) })

	const pkg = Pkg('m')
	pkg.enemy('rat', { hp: 3 })
	// the encounter references slash, but `cards` is never mounted
	pkg.encounter('fight', { enemies: ['rat'], loot: { pool: [slash], offer: 1, picks: 1 } })
	expect(() => pkg.build()).toThrow(/unknown card "slash".*never mounted via use/)
})

test('function-style modules still work and return their exports', () => {
	const cardsModule = defineContent(pkg => {
		const strike = pkg.card('strike', {
			cooldown: 1,
			params: { base: 6 },
			onPlay({ params }) {
				dmg('selected', params.base)
			},
		})
		return { strike }
	})
	const pkg = Pkg('m')
	const { strike } = pkg.use(cardsModule)
	expect(strike.id).toBe('strike')
	const doc = pkg.build() as { cards: Array<{ id: string }> }
	expect(doc.cards.map(c => c.id)).toEqual(['strike'])
})

test('duplicate ids across composers are caught at build', () => {
	const a = content()
	const b = content()
	a.card('same', { onPlay: () => dmg('selected', 1) })
	b.card('same', { onPlay: () => dmg('selected', 1) })
	const pkg = Pkg('m')
	pkg.use(a, b)
	expect(() => pkg.build()).toThrow(/defined twice/)
})
