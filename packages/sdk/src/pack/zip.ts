import JSZip from 'jszip'

import type { ArchiveEntry } from './write-archive'

// fixed date for all entries so two builds of the same source produce
// byte-identical archives — important for caching and future signing
const EPOCH = new Date('2024-01-01T00:00:00.000Z')

/**
 * Pack entries into a .rmod zip buffer.
 * Entries are sorted and stamped with a fixed date for reproducibility.
 */
export async function packZip(entries: ArchiveEntry[]): Promise<Buffer> {
	const zip = new JSZip()
	const sorted = [...entries].sort((a, b) => (a.path < b.path ? -1 : 1))
	for (const e of sorted) {
		zip.file(e.path, e.data, { date: EPOCH })
	}
	return zip.generateAsync({
		type: 'nodebuffer',
		compression: 'DEFLATE',
		compressionOptions: { level: 6 },
	})
}

/** read a .rmod archive and return its files as path → buffer */
export async function unpackZip(buf: Buffer): Promise<Map<string, Buffer>> {
	const zip = await JSZip.loadAsync(buf)
	const out = new Map<string, Buffer>()
	for (const file of Object.values(zip.files)) {
		if (!file.dir) out.set(file.name, await file.async('nodebuffer'))
	}
	return out
}
