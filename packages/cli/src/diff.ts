// Semantic diff of two GCF documents — balance reviews and changelogs.
// Definitions are matched by id within their section; changed leaves are
// reported with their path and both values.

export type ChangeKind = 'added' | 'removed' | 'changed'

export interface Change {
	kind: ChangeKind
	/** "cards/gambit" or "cards/gambit params.base" */
	path: string
	before?: unknown
	after?: unknown
}

const SECTIONS = [
	'affinities',
	'cards',
	'modifiers',
	'enemies',
	'watchers',
	'encounters',
	'maps',
] as const

function byId(section: unknown): Map<string, Record<string, unknown>> {
	const out = new Map<string, Record<string, unknown>>()
	if (!Array.isArray(section)) return out
	for (const entry of section) {
		if (entry && typeof entry === 'object' && typeof entry.id === 'string') {
			out.set(entry.id, entry)
		}
	}
	return out
}

function isPlainObject(x: unknown): x is Record<string, unknown> {
	return typeof x === 'object' && x !== null && !Array.isArray(x)
}

/** leaf-level diff; arrays of differing length are reported as one change */
function walk(a: unknown, b: unknown, path: string, out: Change[]): void {
	if (a === b) return
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) {
			if (JSON.stringify(a) !== JSON.stringify(b)) {
				out.push({ kind: 'changed', path, before: a, after: b })
			}
			return
		}
		for (let i = 0; i < a.length; i++) walk(a[i], b[i], `${path}[${i}]`, out)
		return
	}
	if (isPlainObject(a) && isPlainObject(b)) {
		for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
			const sub = path === '' ? key : `${path}.${key}`
			if (!(key in b)) out.push({ kind: 'removed', path: sub, before: a[key] })
			else if (!(key in a)) out.push({ kind: 'added', path: sub, after: b[key] })
			else walk(a[key], b[key], sub, out)
		}
		return
	}
	out.push({ kind: 'changed', path, before: a, after: b })
}

export function diffDocuments(
	oldDoc: Record<string, unknown>,
	newDoc: Record<string, unknown>,
): Change[] {
	const out: Change[] = []

	for (const field of ['namespace', 'version'] as const) {
		if (oldDoc[field] !== newDoc[field]) {
			out.push({ kind: 'changed', path: field, before: oldDoc[field], after: newDoc[field] })
		}
	}
	walk(oldDoc.requires ?? {}, newDoc.requires ?? {}, 'requires', out)

	for (const section of SECTIONS) {
		const before = byId(oldDoc[section])
		const after = byId(newDoc[section])
		for (const [id, entry] of before) {
			if (!after.has(id)) out.push({ kind: 'removed', path: `${section}/${id}`, before: entry })
		}
		for (const [id, entry] of after) {
			if (!before.has(id)) {
				out.push({ kind: 'added', path: `${section}/${id}`, after: entry })
				continue
			}
			const changes: Change[] = []
			walk(before.get(id), entry, '', changes)
			for (const c of changes) {
				out.push({ ...c, path: `${section}/${id} ${c.path}`.trimEnd() })
			}
		}
	}
	return out
}

export function renderValue(x: unknown): string {
	const s = JSON.stringify(x)
	if (s === undefined) return 'undefined'
	return s.length > 60 ? `${s.slice(0, 57)}...` : s
}
