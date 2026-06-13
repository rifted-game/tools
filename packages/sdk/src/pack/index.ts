// .rmod — a mod's distributable: a zip with the manifest, gcf.json, fluent
// locales and assets. Format invariants (mirroring the engine's rmod.go):
//   - every assets/** file is listed in the manifest with its sha256 — the
//     client caches assets by hash forever, tampering is impossible
//   - the manifest namespace matches gcf.namespace
//   - the archive is deterministic: fixed date, sorted paths — the same
//     input yields a byte-identical .rmod
//
// `locales` is an SDK/client extension of the manifest: the engine's Go
// decoder ignores unknown manifest fields and only polices files under
// assets/, so locale files ride along without engine changes.

import { createHash } from 'node:crypto'
import JSZip from 'jszip'
import { RiftedBuildError } from '../core/scope'

export const RMOD_VERSION = 1

export interface RmodManifest {
	rmod: typeof RMOD_VERSION
	namespace: string
	name: string
	version: string
	authors: string[]
	gcf: string
	assets: Record<string, string>
	/** locale → path inside the archive ("locales/en.ftl"); engine ignores it */
	locales?: Record<string, string>
}

export interface PackInput {
	/** the built GCF document (object) or its JSON string */
	gcf: Record<string, unknown> | string
	name?: string
	/** semver of the distribution */
	version?: string
	authors?: string[]
	/** archive path → contents; paths must start with "assets/" */
	assets?: Record<string, Uint8Array>
	/** locale → .ftl source; packed as locales/<locale>.ftl */
	locales?: Record<string, string>
}

export interface PackResult {
	data: Uint8Array
	manifest: RmodManifest
}

export function sha256hex(data: Uint8Array): string {
	return createHash('sha256').update(data).digest('hex')
}

const ZIP_EPOCH = new Date('2020-01-01T00:00:00Z')
const LOCALE_RE = /^[a-z]{2,3}(-[A-Za-z0-9]+)*$/

/** build a .rmod from a finished document, locales and assets */
export async function packRmod(input: PackInput): Promise<PackResult> {
	const gcfText = typeof input.gcf === 'string' ? input.gcf : JSON.stringify(input.gcf, null, 2)
	let namespace: string
	try {
		namespace = JSON.parse(gcfText).namespace
	} catch (err) {
		throw new RiftedBuildError(`packRmod: gcf is not valid JSON: ${(err as Error).message}`)
	}
	if (typeof namespace !== 'string' || namespace === '') {
		throw new RiftedBuildError('packRmod: gcf document has no namespace')
	}

	const manifest: RmodManifest = {
		rmod: RMOD_VERSION,
		namespace,
		name: input.name ?? namespace,
		version: input.version ?? '0.1.0',
		authors: input.authors ?? [],
		gcf: 'gcf.json',
		assets: {},
	}

	const assetPaths = Object.keys(input.assets ?? {}).sort()
	for (const path of assetPaths) {
		if (!path.startsWith('assets/')) {
			throw new RiftedBuildError(`packRmod: asset path "${path}" must live under assets/`)
		}
		manifest.assets[path] = sha256hex((input.assets as Record<string, Uint8Array>)[path])
	}

	const localeNames = Object.keys(input.locales ?? {}).sort()
	if (localeNames.length > 0) {
		manifest.locales = {}
		for (const locale of localeNames) {
			if (!LOCALE_RE.test(locale)) {
				throw new RiftedBuildError(`packRmod: bad locale "${locale}" (expected e.g. "en", "pt-BR")`)
			}
			manifest.locales[locale] = `locales/${locale}.ftl`
		}
	}

	const zip = new JSZip()
	const put = (path: string, data: string | Uint8Array) =>
		zip.file(path, data, { date: ZIP_EPOCH, createFolders: false })

	put('manifest.json', JSON.stringify(manifest, null, 2))
	put('gcf.json', gcfText)
	for (const locale of localeNames) {
		put(`locales/${locale}.ftl`, (input.locales as Record<string, string>)[locale])
	}
	for (const path of assetPaths) {
		put(path, (input.assets as Record<string, Uint8Array>)[path])
	}

	const data = await zip.generateAsync({
		type: 'uint8array',
		compression: 'DEFLATE',
		compressionOptions: { level: 9 },
	})
	return { data, manifest }
}

export interface OpenedRmod {
	manifest: RmodManifest
	gcf: Record<string, unknown>
	assets: Record<string, Uint8Array>
	/** locale → .ftl source, resolved through the manifest */
	locales: Record<string, string>
}

/** unpack and verify a .rmod (hashes, unlisted assets, namespace match) */
export async function openRmod(data: Uint8Array): Promise<OpenedRmod> {
	const zip = await JSZip.loadAsync(data)

	const manifestFile = zip.file('manifest.json')
	if (!manifestFile) throw new RiftedBuildError('rmod: manifest.json missing')
	const manifest = JSON.parse(await manifestFile.async('text')) as RmodManifest
	if (manifest.rmod !== RMOD_VERSION) {
		throw new RiftedBuildError(
			`rmod: format version ${manifest.rmod}, sdk supports ${RMOD_VERSION}`,
		)
	}
	if (!manifest.namespace) throw new RiftedBuildError('rmod: manifest has no namespace')

	const gcfPath = manifest.gcf || 'gcf.json'
	const gcfFile = zip.file(gcfPath)
	if (!gcfFile) throw new RiftedBuildError(`rmod: gcf document "${gcfPath}" missing`)
	const gcf = JSON.parse(await gcfFile.async('text')) as Record<string, unknown>
	if (gcf.namespace !== manifest.namespace) {
		throw new RiftedBuildError(
			`rmod: manifest namespace "${manifest.namespace}" != gcf namespace "${gcf.namespace}"`,
		)
	}

	const assets: Record<string, Uint8Array> = {}
	for (const [path, want] of Object.entries(manifest.assets ?? {})) {
		const file = zip.file(path)
		if (!file) throw new RiftedBuildError(`rmod: asset "${path}" in manifest but not in archive`)
		const bytes = await file.async('uint8array')
		const got = sha256hex(bytes)
		if (got.toLowerCase() !== want.toLowerCase()) {
			throw new RiftedBuildError(
				`rmod: asset "${path}" hash mismatch: manifest ${want}, actual ${got}`,
			)
		}
		assets[path] = bytes
	}
	for (const path of Object.keys(zip.files)) {
		if (zip.files[path].dir) continue
		if (path.startsWith('assets/') && !manifest.assets?.[path]) {
			throw new RiftedBuildError(`rmod: asset "${path}" is not listed in manifest`)
		}
	}

	const locales: Record<string, string> = {}
	for (const [locale, path] of Object.entries(manifest.locales ?? {})) {
		const file = zip.file(path)
		if (!file) throw new RiftedBuildError(`rmod: locale "${locale}" points to missing "${path}"`)
		locales[locale] = await file.async('text')
	}

	return { manifest, gcf, assets, locales }
}
