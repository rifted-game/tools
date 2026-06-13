// The engine contract: the SDK versions of examples/vanilla must build into
// the exact documents stored in the engine repo (internal/engine/*.gcf.json)

import { expect, test } from 'bun:test'
import { examplesPkg } from './content/examples'
import { vanillaPkg } from './content/vanilla'
import examplesFixture from './fixtures/examples.gcf.json'
import vanillaFixture from './fixtures/vanilla.gcf.json'

test('examples: SDK builds a document identical to the engine fixture', () => {
	expect(examplesPkg().build()).toEqual(examplesFixture)
})

test('vanilla: SDK builds a document identical to the engine fixture', () => {
	expect(vanillaPkg().build()).toEqual(vanillaFixture)
})

test('builds are deterministic: two runs yield identical JSON', () => {
	const a = JSON.stringify(examplesPkg().build())
	const b = JSON.stringify(examplesPkg().build())
	expect(a).toBe(b)
})

test('inline strings never leak into the document', () => {
	// examples content declares name/description on lender and collector —
	// the document still equals the string-free engine fixture (asserted
	// above); here we double-check no string-ish fields exist at all
	const doc = examplesPkg().build() as { cards: Array<Record<string, unknown>> }
	for (const card of doc.cards) {
		expect(card).not.toHaveProperty('name')
		expect(card).not.toHaveProperty('description')
	}
})
