// typegen: a public gcf.json becomes a typed refs module

import { expect, test } from 'bun:test'
import examples from '../../sdk/tests/fixtures/examples.gcf.json'
import vanilla from '../../sdk/tests/fixtures/vanilla.gcf.json'
import { generatePackage, generateRefsModule } from '../src/typegen'

test('emits qualified refs for every section', () => {
	const code = generateRefsModule(vanilla as Record<string, unknown>, 'vanilla.gcf.json')
	expect(code).toContain(`export const namespace = 'vanilla'`)
	expect(code).toContain(`strike: { kind: 'card', id: 'vanilla:strike' },`)
	expect(code).toContain(`surge: { kind: 'modifier', id: 'vanilla:surge' },`)
	expect(code).toContain(`berserk: { kind: 'affinity', id: 'vanilla:berserk' },`)
	expect(code).toContain(`act1: { kind: 'map', id: 'vanilla:act1' },`)
	expect(code).toContain(`satisfies Record<string, Ref<'card'>>`)
	expect(code).toContain(`export const version = 1`)
	expect(code).toContain(`requires: [<this module>]`)
})

test('scrapes events with payload shapes and state keys from ops', () => {
	const code = generateRefsModule(examples as Record<string, unknown>, 'examples.gcf.json')
	// emitted events carry their payload shape
	expect(code).toContain(`jackpot: new EventHandle<{ roll: number }>('ex:jackpot'),`)
	expect(code).toContain(`loan_taken: new EventHandle<{ amount: number }>('ex:loan_taken'),`)
	// state keys from add_state/set_state/spend_player_state
	expect(code).toContain(`coins: new PlayerStateHandle('ex:coins'),`)
	expect(code).toContain(`debt: new StateEntry('team.state.ex:debt', 'team', 'ex:debt'),`)
	// watchers section exists too
	expect(code).toContain(`interest: { kind: 'watcher', id: 'ex:interest' },`)
})

test('--package emits a publishable bridge with sdk as a peer dep', () => {
	const files = generatePackage(vanilla as Record<string, unknown>, 'vanilla.gcf.json')
	expect(Object.keys(files).sort()).toEqual(['README.md', 'index.ts', 'package.json'])

	const manifest = JSON.parse(files['package.json'])
	expect(manifest.name).toBe('@vanilla/types')
	expect(manifest.version).toBe('1.0.0') // doc version 1 → semver 1.0.0
	// peer, not dependency: one shared @rifted/sdk instance for instanceof
	expect(manifest.peerDependencies).toEqual({ '@rifted/sdk': '^1.0.0' })
	expect(manifest.dependencies).toBeUndefined()
	expect(manifest.exports['.'].types).toBe('./index.ts')

	expect(files['index.ts']).toContain(`export const version = 1`)
	expect(files['README.md']).toContain('requires: [vanilla]')
})

test('--package honors a custom name', () => {
	const files = generatePackage(vanilla as Record<string, unknown>, 'x', {
		name: '@rifted/vanilla',
	})
	expect(JSON.parse(files['package.json']).name).toBe('@rifted/vanilla')
})

test('sections without entries are omitted', () => {
	const code = generateRefsModule(
		{ gcf: 1, namespace: 'tiny', cards: [{ id: 'a' }] },
		'tiny.gcf.json',
	)
	expect(code).toContain('export const cards')
	expect(code).not.toContain('export const enemies')
	expect(code).not.toContain('export const events')
})
