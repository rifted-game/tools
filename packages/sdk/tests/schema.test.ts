// Schema: engine fixtures pass, junk does not, op tables catch typos,
// the JSON Schema 2020-12 emits

import { expect, test } from 'bun:test'
import { gcfDocument, toJsonSchema, validateDocument } from '../src/schema/index'
import examplesFixture from './fixtures/examples.gcf.json'
import vanillaFixture from './fixtures/vanilla.gcf.json'

test('engine fixtures are schema-valid', () => {
	expect(() => validateDocument(examplesFixture)).not.toThrow()
	expect(() => validateDocument(vanillaFixture)).not.toThrow()
})

test('an unknown definition field is rejected', () => {
	const doc = {
		gcf: 1,
		namespace: 'n',
		cards: [{ id: 'a', coldown: 1 }],
	}
	expect(gcfDocument.safeParse(doc).success).toBe(false)
})

test('a watcher without hook or reveal is rejected', () => {
	const doc = { gcf: 1, namespace: 'n', watchers: [{ id: 'w' }] }
	expect(gcfDocument.safeParse(doc).success).toBe(false)
})

test('a watcher with both hook AND reveal is rejected', () => {
	const doc = {
		gcf: 1,
		namespace: 'n',
		watchers: [
			{
				id: 'w',
				hook: { on: 'turn_end', do: ['noop'] },
				reveal: { on: 'damage_taken', field: 'amount', threshold: 5 },
			},
		],
	}
	expect(gcfDocument.safeParse(doc).success).toBe(false)
})

test('a broken map definition (floors < 4) is rejected', () => {
	const doc = {
		gcf: 1,
		namespace: 'n',
		maps: [{ id: 'm', floors: 2, width: 3, paths: 1 }],
	}
	expect(gcfDocument.safeParse(doc).success).toBe(false)
})

test('an encounter with loot but no offer/picks is rejected', () => {
	const doc = {
		gcf: 1,
		namespace: 'n',
		encounters: [{ id: 'e', enemies: ['x'], loot: ['a'] }],
	}
	expect(gcfDocument.safeParse(doc).success).toBe(false)
})

// --- op tables: hand-written documents fail with engine-grade errors ---

function opError(onPlay: unknown): string {
	try {
		validateDocument({ gcf: 1, namespace: 'n', cards: [{ id: 'a', on_play: onPlay }] })
		return ''
	} catch (err) {
		return (err as Error).message
	}
}

test('a typoed effect op gets did-you-mean', () => {
	const msg = opError(['dmage', 'selected', 6])
	expect(msg).toContain('unknown effect op "dmage"')
	expect(msg).toContain('did you mean "damage"')
	expect(msg).toContain('cards[0].on_play')
})

test('wrong arity reports the signature', () => {
	const msg = opError(['damage', 'selected'])
	expect(msg).toContain('got 1 args')
	expect(msg).toContain('damage(target, amount)')
})

test('an unknown target gets did-you-mean', () => {
	const msg = opError(['damage', 'slected', 6])
	expect(msg).toContain('unknown target "slected"')
	expect(msg).toContain('did you mean "selected"')
})

test('an unknown state level gets did-you-mean', () => {
	const msg = opError(['add_state', 'tem', 'x', 1])
	expect(msg).toContain('unknown state level "tem"')
	expect(msg).toContain('did you mean "team"')
})

test('a typoed value op inside a nested expression is found with its path', () => {
	const msg = opError(['damage', 'selected', ['scal', 'card.params.base']])
	expect(msg).toContain('unknown value op "scal"')
	expect(msg).toContain('did you mean "scale"')
})

test('a typoed builtin event in a hook is rejected', () => {
	expect(() =>
		validateDocument({
			gcf: 1,
			namespace: 'n',
			modifiers: [{ id: 'm', hooks: [{ on: 'card_playd', do: ['noop'] }] }],
		}),
	).toThrow(/unknown event "card_playd".*did you mean "card_played"/)
})

test('custom namespaced events pass', () => {
	expect(() =>
		validateDocument({
			gcf: 1,
			namespace: 'n',
			watchers: [{ id: 'w', hook: { on: 'n:custom', do: ['noop'] } }],
		}),
	).not.toThrow()
})

test('the JSON Schema 2020-12 emits and declares its dialect', () => {
	const schema = toJsonSchema()
	expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema')
	expect(JSON.stringify(schema)).toContain('namespace')
})
