// .rmod: roundtrip, hash verification, locales, archive determinism

import { expect, test } from 'bun:test'
import { openRmod, packRmod, sha256hex } from '../src/pack/index'
import { vanillaPkg } from './content/vanilla'

const enc = new TextEncoder()

function vanillaAssets(): Record<string, Uint8Array> {
	const paths = [
		'assets/affinity/berserk.png',
		'assets/affinity/weaver.png',
		'assets/cards/strike.png',
		'assets/cards/emberseal.png',
		'assets/sfx/slash.ogg',
		'assets/sfx/smash.ogg',
		'assets/mobs/brute.png',
	]
	return Object.fromEntries(paths.map(p => [p, enc.encode(`bytes-of-${p}`)]))
}

test('pack → open roundtrip: manifest, gcf, locales, hashed assets', async () => {
	const pkg = vanillaPkg()
	const assets = vanillaAssets()
	const { data, manifest } = await packRmod({
		gcf: pkg.build(),
		name: pkg.meta.name,
		version: pkg.meta.semver,
		authors: [...pkg.meta.authors],
		assets,
		locales: { en: 'card-vanilla-strike =\n    .name = Strike\n' },
	})

	expect(manifest.namespace).toBe('vanilla')
	expect(Object.keys(manifest.assets)).toHaveLength(7)
	expect(manifest.locales).toEqual({ en: 'locales/en.ftl' })

	const opened = await openRmod(data)
	expect(opened.manifest).toEqual(manifest)
	expect(opened.gcf.namespace).toBe('vanilla')
	expect(opened.locales.en).toContain('.name = Strike')
	expect(opened.assets['assets/cards/strike.png']).toEqual(assets['assets/cards/strike.png'])
	expect(manifest.assets['assets/cards/strike.png']).toBe(
		sha256hex(assets['assets/cards/strike.png']),
	)
})

test('the archive is deterministic: same input, byte-identical .rmod', async () => {
	const input = () => ({ gcf: vanillaPkg().build(), assets: vanillaAssets() })
	const a = await packRmod(input())
	const b = await packRmod(input())
	expect(a.data).toEqual(b.data)
})

test('an asset outside assets/ is rejected', async () => {
	await expect(
		packRmod({ gcf: vanillaPkg().build(), assets: { 'icons/x.png': enc.encode('x') } }),
	).rejects.toThrow(/assets\//)
})

test('a bad locale name is rejected', async () => {
	await expect(
		packRmod({ gcf: vanillaPkg().build(), locales: { 'EN US': 'x = y\n' } }),
	).rejects.toThrow(/bad locale/)
})

test('a tampered asset is caught by verification', async () => {
	const { data } = await packRmod({
		gcf: vanillaPkg().build(),
		assets: { 'assets/a.png': enc.encode('original') },
	})
	// repack the archive with different asset bytes, manifest untouched
	const JSZip = (await import('jszip')).default
	const zip = await JSZip.loadAsync(data)
	zip.file('assets/a.png', enc.encode('tampered'))
	const tampered = await zip.generateAsync({ type: 'uint8array' })
	await expect(openRmod(tampered)).rejects.toThrow(/hash mismatch/)
})

test('an unlisted file under assets/ is rejected', async () => {
	const { data } = await packRmod({ gcf: vanillaPkg().build() })
	const JSZip = (await import('jszip')).default
	const zip = await JSZip.loadAsync(data)
	zip.file('assets/ghost.png', enc.encode('boo'))
	const withGhost = await zip.generateAsync({ type: 'uint8array' })
	await expect(openRmod(withGhost)).rejects.toThrow(/not listed in manifest/)
})
