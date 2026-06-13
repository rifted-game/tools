// Localization: inline strings → fluent files, key aliases, hand-written
// merge, scaffold stubs with translator comments

import { expect, test } from 'bun:test'
import { block, dmg, Pkg } from '../src/index'
import { examplesPkg } from './content/examples'

function strikePkg() {
	const pkg = Pkg('mymod', { defaultLocale: 'en' })
	pkg.card('strike', {
		name: 'Strike',
		description: 'Deal { $dmg } damage.',
		cooldown: 1,
		params: { base: 6 },
		render: ({ params }) => ({ dmg: params.base.scaled() }),
		onPlay({ params }) {
			dmg('selected', params.base)
		},
	})
	pkg.card('guard', {
		name: { en: 'Guard', ru: 'Защита' },
		cooldown: 1,
		onPlay() {
			block(5)
		},
	})
	pkg.modifier('venom', {
		name: { key: 'shared-venom.name' },
	})
	return pkg
}

test('inline strings compile into per-locale fluent files', () => {
	const loc = strikePkg().locales()
	expect(loc.locales).toEqual(['en', 'ru'])

	const en = loc.ftl('en')
	expect(en).toContain('card-mymod-strike =')
	expect(en).toContain('.name = Strike')
	// placeables pass through verbatim — render args are fluent variables
	expect(en).toContain('.description = Deal { $dmg } damage.')
	// translator comment carries kind, params and available variables
	expect(en).toContain('# card mymod:strike — params: base=6 — variables: { $dmg }')
	expect(en).toContain('.name = Guard')

	const ru = loc.ftl('ru')
	expect(ru).toContain('.name = Защита')
	// strike has no ru text → not generated for ru
	expect(ru).not.toContain('card-mymod-strike')
})

test('a key alias becomes a fluent message reference in every locale', () => {
	const loc = strikePkg().locales()
	expect(loc.ftl('en')).toContain('modifier-mymod-venom =')
	expect(loc.ftl('en')).toContain('.name = { shared-venom.name }')
	expect(loc.ftl('ru')).toContain('.name = { shared-venom.name }')
})

test('hand-written messages win over generated ones', () => {
	const loc = strikePkg().locales()
	const hand = `# translator-owned\ncard-mymod-strike =\n    .name = Mega Strike\n`
	const merged = loc.ftl('en', hand) as string
	expect(merged).toContain('.name = Mega Strike')
	// the generated block for strike is skipped wholesale
	expect(merged).not.toContain('.name = Strike\n')
	// other messages are still appended after the handwritten part
	expect(merged).toContain('.name = Guard')
	expect(merged.indexOf('Mega Strike')).toBeLessThan(merged.indexOf('Guard'))
})

test('scaffold appends stubs only for missing keys, with placeholders', () => {
	const loc = strikePkg().locales()
	const existingRu = `card-mymod-guard =\n    .name = Защита\n`
	const stubs = loc.scaffold('ru', existingRu) as string
	// guard is covered; strike gets a stub with the default-locale text
	expect(stubs).toContain('card-mymod-strike =')
	expect(stubs).toContain('.name = Strike')
	expect(stubs).not.toContain('card-mymod-guard =')

	// everything covered → nothing to scaffold
	const full = `${existingRu}\ncard-mymod-strike =\n    .name = Удар\n    .description = x\n\nmodifier-mymod-venom =\n    .name = Яд\n`
	expect(loc.scaffold('ru', full)).toBeNull()
})

test('missing() reports per-locale coverage gaps', () => {
	const loc = strikePkg().locales()
	// en: everything has text or an alias
	expect(loc.missing('en')).toEqual([])
	// ru: strike has no ru text; guard does; venom is an alias (covered)
	const ru = loc.missing('ru')
	expect(ru.map(m => `${m.id}.${m.attr}`)).toEqual([
		'card-mymod-strike.name',
		'card-mymod-strike.description',
	])
	// hand-written ru file closes the gap
	const hand = 'card-mymod-strike =\n    .name = Удар\n    .description = x\n'
	expect(loc.missing('ru', hand)).toEqual([])
	// a brand-new locale misses everything that is not an alias
	expect(loc.missing('fr').length).toBe(3)
})

test('broken fluent syntax in an inline string fails the build', () => {
	const pkg = Pkg('t')
	pkg.card('bad', {
		name: 'Deal { $dmg damage', // unclosed placeable
		onPlay() {
			block(1)
		},
	})
	expect(() => pkg.locales().ftl('en')).toThrow(/not valid fluent syntax/)
})

test('a visible quest watcher requires an explicit id', () => {
	const pkg = Pkg('t')
	expect(() =>
		pkg.card('c', {
			onPlay({ deferCard }) {
				dmg('selected', 1)
				deferCard({
					visible: true,
					on: 'damage_dealt',
					do({ card }) {
						card.state.x.inc(1)
					},
				})
			},
		}),
	).toThrow(/explicit id/)
})

test('examples content: strings exist alongside an unchanged document', () => {
	const loc = examplesPkg().locales()
	const en = loc.ftl('en')
	expect(en).toContain('card-ex-lender =')
	expect(en).toContain('.name = Lender')
	const ru = loc.ftl('ru')
	expect(ru).toContain('.name = Коллектор')
})
