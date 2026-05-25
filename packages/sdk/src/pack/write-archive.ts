import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/** walk subdirs under modRoot and return a posix-relative-path → absolute-path map */
export function collectFiles(modRoot: string, subdirs: string[]): Map<string, string> {
	const out = new Map<string, string>()
	for (const subdir of subdirs) {
		const abs = join(modRoot, subdir)
		try {
			statSync(abs)
		} catch {
			continue
		}
		walk(abs, modRoot, out)
	}
	return out
}

function walk(dir: string, root: string, out: Map<string, string>): void {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const abs = join(dir, entry.name)
		if (entry.isDirectory()) {
			walk(abs, root, out)
		} else if (entry.isFile()) {
			out.set(relative(root, abs).split(sep).join('/'), abs)
		}
	}
}

export interface ArchiveEntry {
	path: string
	data: Buffer
}

/** assemble manifest + gcf + collected files into an ordered entry list */
export function buildEntries(
	manifest: object,
	gcfBuf: Buffer,
	files: Map<string, string>,
): ArchiveEntry[] {
	const entries: ArchiveEntry[] = [
		{ path: 'manifest.json', data: Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8') },
		{ path: 'gcf.json', data: gcfBuf },
	]
	for (const [rel, abs] of files) {
		entries.push({ path: rel, data: readFileSync(abs) })
	}
	return entries
}
