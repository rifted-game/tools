import { describe, expect, test } from 'bun:test'

import { buildSummary, computeBundleHash, Manifest, sha256 } from '../src/pack/manifest'

describe('pack/manifest', () => {
	test('sha256 returns a 64-char hex string', () => {
		expect(sha256(Buffer.from('hello'))).toMatch(/^[a-f0-9]{64}$/)
	})

	test('computeBundleHash is order-independent', () => {
		const a = {
			'a.json': { size: 1, sha256: 'a'.repeat(64) },
			'b.json': { size: 2, sha256: 'b'.repeat(64) },
		}
		const b = {
			'b.json': { size: 2, sha256: 'b'.repeat(64) },
			'a.json': { size: 1, sha256: 'a'.repeat(64) },
		}
		expect(computeBundleHash(a)).toBe(computeBundleHash(b))
	})

	test('computeBundleHash changes when content changes', () => {
		const a = { 'x.json': { size: 1, sha256: 'a'.repeat(64) } }
		const b = { 'x.json': { size: 1, sha256: 'b'.repeat(64) } }
		expect(computeBundleHash(a)).not.toBe(computeBundleHash(b))
	})

	test('Manifest parses valid input', () => {
		const m = {
			manifest_version: 1,
			namespace: 'my_mod',
			version: '0.1.0',
			name: 'My Mod',
			rifted_version: '>=0.5.0',
			dependencies: {},
			kind: 'content',
			translates: null,
			bundle_hash: 'sha256:' + 'a'.repeat(64),
			files: { 'gcf.json': { size: 100, sha256: 'a'.repeat(64) } },
			summary: buildSummary({ locales: [{ lang: 'en' }] } as any),
		}
		expect(() => Manifest.parse(m)).not.toThrow()
	})

	test('buildSummary deduplicates and sorts locales', () => {
		const s = buildSummary({ locales: [{ lang: 'ru' }, { lang: 'en' }, { lang: 'ru' }] } as any)
		expect(s.locales).toEqual(['en', 'ru'])
	})
})
