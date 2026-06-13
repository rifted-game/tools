// Semantic GCF diff: added/removed definitions, leaf changes with paths

import { expect, test } from 'bun:test'
import vanilla from '../../sdk/tests/fixtures/vanilla.gcf.json'
import { diffDocuments } from '../src/diff'

const base = vanilla as Record<string, unknown>

function clone(): Record<string, unknown> {
	return JSON.parse(JSON.stringify(base))
}

test('identical documents diff to nothing', () => {
	expect(diffDocuments(base, clone())).toEqual([])
})

test('a balance tweak surfaces as a leaf change with its path', () => {
	const next = clone()
	;(next.cards as any[])[0].params.base = 7 // strike: 6 → 7
	const changes = diffDocuments(base, next)
	expect(changes).toEqual([
		{ kind: 'changed', path: 'cards/strike params.base', before: 6, after: 7 },
	])
})

test('added and removed definitions are reported per section', () => {
	const next = clone()
	;(next.cards as any[]).push({ id: 'fresh', cooldown: 1 })
	;(next.enemies as any[]).shift() // drop goblin
	const changes = diffDocuments(base, next)
	expect(changes).toContainEqual(expect.objectContaining({ kind: 'added', path: 'cards/fresh' }))
	expect(changes).toContainEqual(
		expect.objectContaining({ kind: 'removed', path: 'enemies/goblin' }),
	)
})

test('effect-tree edits are caught (same-length arrays recurse)', () => {
	const next = clone()
	;(next.cards as any[])[0].on_play = ['damage', 'all_enemies', 'card.params.base']
	const changes = diffDocuments(base, next)
	expect(changes).toEqual([
		{
			kind: 'changed',
			path: 'cards/strike on_play[1]',
			before: 'selected',
			after: 'all_enemies',
		},
	])
})

test('field additions inside a definition are leaf-level', () => {
	const next = clone()
	;(next.modifiers as any[])[0].duration = 3
	const changes = diffDocuments(base, next)
	expect(changes).toEqual([{ kind: 'added', path: 'modifiers/surge duration', after: 3 }])
})

test('doc-level version and requires changes are reported', () => {
	const next = clone()
	next.version = 2
	next.requires = { core: 1 }
	const changes = diffDocuments(base, next)
	expect(changes).toContainEqual({ kind: 'changed', path: 'version', before: 1, after: 2 })
	expect(changes).toContainEqual({ kind: 'added', path: 'requires.core', after: 1 })
})
