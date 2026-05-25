import { describe, expect, test } from 'bun:test'

import { packZip, unpackZip } from '../src/pack/zip'

describe('pack/zip', () => {
	test('round-trip preserves all files', async () => {
		const entries = [
			{ path: 'manifest.json', data: Buffer.from('{"v":1}') },
			{ path: 'gcf.json', data: Buffer.from('{}') },
			{ path: 'assets/x.png', data: Buffer.from([1, 2, 3, 4]) },
		]
		const zipped = await packZip(entries)
		const unpacked = await unpackZip(zipped)

		expect(unpacked.size).toBe(3)
		expect(unpacked.get('manifest.json')?.toString()).toBe('{"v":1}')
		expect(unpacked.get('assets/x.png')?.toString('hex')).toBe('01020304')
	})

	test('is reproducible — same input produces identical bytes', async () => {
		const entries = [
			{ path: 'a.txt', data: Buffer.from('hello') },
			{ path: 'b.txt', data: Buffer.from('world') },
		]
		const first = await packZip(entries)
		const second = await packZip(entries)
		expect(first.equals(second)).toBe(true)
	})

	test('entry order does not affect output', async () => {
		const e1 = [
			{ path: 'b.txt', data: Buffer.from('b') },
			{ path: 'a.txt', data: Buffer.from('a') },
		]
		const e2 = [
			{ path: 'a.txt', data: Buffer.from('a') },
			{ path: 'b.txt', data: Buffer.from('b') },
		]
		expect((await packZip(e1)).equals(await packZip(e2))).toBe(true)
	})
})
