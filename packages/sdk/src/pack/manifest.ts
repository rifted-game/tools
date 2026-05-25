import { createHash } from 'node:crypto'

import { z } from 'zod'

const FileEntry = z
	.object({
		size: z.number().int().min(0),
		sha256: z.string().regex(/^[a-f0-9]{64}$/),
	})
	.strict()

const Summary = z
	.object({
		cards: z.number().int().min(0),
		buffs: z.number().int().min(0),
		relics: z.number().int().min(0),
		enemies: z.number().int().min(0),
		summons: z.number().int().min(0),
		encounters: z.number().int().min(0),
		locations: z.number().int().min(0),
		match_modes: z.number().int().min(0),
		locales: z.array(z.string()),
	})
	.strict()

export const Manifest = z
	.object({
		manifest_version: z.literal(1),
		namespace: z.string().regex(/^[a-z][a-z0-9_]*$/),
		version: z.string().min(1),
		name: z.string(),
		author: z.string().optional(),
		description: z.string().optional(),
		homepage: z.string().optional(),
		license: z.string().optional(),
		rifted_version: z.string(),
		dependencies: z.record(z.string(), z.string()),
		kind: z.enum(['content', 'translation']),
		translates: z.array(z.string()).nullable(),
		// stable content-hash used as the mod's network identity.
		// see computeBundleHash() for the derivation
		bundle_hash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
		files: z.record(z.string(), FileEntry),
		summary: Summary,
	})
	.strict()

export type Manifest = z.infer<typeof Manifest>
export type FileEntry = z.infer<typeof FileEntry>
export type Summary = z.infer<typeof Summary>

export function sha256(buf: Buffer | Uint8Array): string {
	return createHash('sha256').update(buf).digest('hex')
}

/**
 * Stable identifier for a mod's contents.
 *
 * Derived from sha256 of the sorted file list (path + size + hash), not the
 * raw zip bytes. Two builds of the same source with different zip metadata
 * (timestamps, compression level) produce the same bundle_hash. Changing this
 * algorithm invalidates all previously published mod identities — keep it stable.
 */
export function computeBundleHash(files: Record<string, FileEntry>): string {
	const payload = Object.keys(files)
		.sort()
		.map(k => ({ path: k, size: files[k].size, sha256: files[k].sha256 }))
	return `sha256:${sha256(Buffer.from(JSON.stringify(payload), 'utf-8'))}`
}

interface SummaryInput {
	cards?: unknown[]
	buffs?: unknown[]
	relics?: unknown[]
	enemies?: unknown[]
	summons?: unknown[]
	encounters?: unknown[]
	locations?: unknown[]
	match_modes?: unknown[]
	locales?: Array<{ lang: string }>
}

export function buildSummary(gcf: SummaryInput): Summary {
	return {
		cards: gcf.cards?.length ?? 0,
		buffs: gcf.buffs?.length ?? 0,
		relics: gcf.relics?.length ?? 0,
		enemies: gcf.enemies?.length ?? 0,
		summons: gcf.summons?.length ?? 0,
		encounters: gcf.encounters?.length ?? 0,
		locations: gcf.locations?.length ?? 0,
		match_modes: gcf.match_modes?.length ?? 0,
		locales: [...new Set((gcf.locales ?? []).map(l => l.lang))].sort(),
	}
}
