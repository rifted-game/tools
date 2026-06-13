// Loading the author's entry: src/index.ts default-exports a Pkg. jiti
// executes TS on the fly; a fresh instance per run so watch mode never
// serves a stale module cache

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createJiti } from 'jiti'

export interface ModMeta {
	namespace: string
	name: string
	semver: string
	authors: readonly string[]
}

/** duck-typed LocalesBuild from @rifted/sdk (jiti loads its own realm) */
export interface LocalesLike {
	locales: string[]
	entries: Array<{ id: string; comment: string; attrs: Record<string, unknown> }>
	ftl(locale: string, handwritten?: string): string | null
	scaffold(locale: string, existing?: string): string | null
	missing(
		locale: string,
		handwritten?: string,
	): Array<{ id: string; attr: string; comment: string }>
}

export interface LoadedMod {
	doc: Record<string, unknown>
	meta: ModMeta
	locales?: LocalesLike
}

interface PkgLike {
	build(): Record<string, unknown>
	locales?(): LocalesLike
	meta?: Partial<ModMeta>
}

export async function loadMod(entryPath: string): Promise<LoadedMod> {
	const jiti = createJiti(import.meta.url, { cache: false, moduleCache: false })
	const mod = (await jiti.import(entryPath)) as { default?: unknown }
	const value = mod.default

	if (value && typeof value === 'object' && typeof (value as PkgLike).build === 'function') {
		const pkg = value as PkgLike
		const doc = pkg.build()
		const ns = String(doc.namespace ?? '')
		return {
			doc,
			meta: {
				namespace: ns,
				name: pkg.meta?.name ?? ns,
				semver: pkg.meta?.semver ?? '0.1.0',
				authors: pkg.meta?.authors ?? [],
			},
			locales: typeof pkg.locales === 'function' ? pkg.locales() : undefined,
		}
	}

	// a ready document is accepted too (builds from JSON generators)
	if (value && typeof value === 'object' && (value as { gcf?: unknown }).gcf === 1) {
		const doc = value as Record<string, unknown>
		const ns = String(doc.namespace ?? '')
		return { doc, meta: { namespace: ns, name: ns, semver: '0.1.0', authors: [] } }
	}

	throw new Error(
		'entry must `export default` a Pkg (or a ready GCF document) — see `rifted init` template',
	)
}

/** hand-written locale files from <root>/locales/*.ftl */
export function readLocaleDir(root: string): Record<string, string> {
	const dir = join(root, 'locales')
	const out: Record<string, string> = {}
	if (!existsSync(dir)) return out
	for (const file of readdirSync(dir)) {
		if (!file.endsWith('.ftl')) continue
		out[file.slice(0, -4)] = readFileSync(join(dir, file), 'utf-8')
	}
	return out
}

/** final per-locale .ftl set: hand-written files merged with generated strings */
export function assembleLocales(root: string, locales?: LocalesLike): Record<string, string> {
	const handwritten = readLocaleDir(root)
	const names = new Set<string>([...Object.keys(handwritten), ...(locales?.locales ?? [])])
	const out: Record<string, string> = {}
	for (const name of [...names].sort()) {
		const merged = locales ? locales.ftl(name, handwritten[name]) : (handwritten[name] ?? null)
		if (merged !== null) out[name] = merged
	}
	return out
}
