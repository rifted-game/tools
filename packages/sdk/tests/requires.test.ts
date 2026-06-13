// requires: literal maps and dependency modules (the typed-bridge shape)

import { expect, test } from 'bun:test'
import { dmg, Pkg } from '../src/index'

function docOf(opts: Parameters<typeof Pkg>[1]): Record<string, unknown> {
	const pkg = Pkg('mymod', opts)
	pkg.card('c', { onPlay: () => dmg('selected', 1) })
	return pkg.build()
}

test('a literal requires map passes through', () => {
	expect(docOf({ requires: { vanilla: 3, core: 1 } }).requires).toEqual({ vanilla: 3, core: 1 })
})

test('dependency modules contribute namespace → version (version from the package)', () => {
	// what `import * as vanilla from "@rifted/vanilla"` looks like structurally
	const vanilla = { namespace: 'vanilla', version: 5, cards: {}, events: {} }
	const core = { namespace: 'core', version: 2 }
	expect(docOf({ requires: [vanilla, core] }).requires).toEqual({ vanilla: 5, core: 2 })
})

test('a namespace listed twice keeps the highest floor', () => {
	const a = { namespace: 'vanilla', version: 2 }
	const b = { namespace: 'vanilla', version: 4 }
	expect(docOf({ requires: [a, b] }).requires).toEqual({ vanilla: 4 })
})

test('empty requires is omitted from the document', () => {
	expect('requires' in docOf({})).toBe(false)
	expect('requires' in docOf({ requires: [] })).toBe(false)
})

test('a bad dependency namespace fails the build', () => {
	expect(() => docOf({ requires: [{ namespace: 'Bad NS', version: 1 }] })).toThrow(/bad namespace/)
})

test('a non-integer dependency version fails the build', () => {
	expect(() => docOf({ requires: [{ namespace: 'vanilla', version: 1.5 }] })).toThrow(
		/non-negative integer/,
	)
})
