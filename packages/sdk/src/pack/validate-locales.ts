import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { parse, type Resource } from '@fluent/syntax'

import { expectedKeysFromGcf } from './expected-keys'

export interface LocaleReport {
	errors: string[]
	warnings: string[]
}

interface GcfLike {
	package?: { namespace?: string; translates?: string[] }
	locales?: Array<{ lang: string; path: string }>
}

// per-language index of every message and attribute key found in the file
type LocaleIndex = Map<string, Set<string>>

/**
 * Validates the locale layer of a mod.
 *
 * Checks:
 * - declared ftl files exist on disk
 * - files are utf-8 without BOM and use space indentation (fluent requirement)
 * - parser produces valid messages, not just junk
 * - every message id is prefixed by the mod namespace (or one from `translates`)
 * - required keys (card.name, buff.description, ...) are present in at least one language
 * - optional keys (encounter.title, ...) warn when missing
 * - keys missing from some but not all languages warn
 * - orphan keys (in ftl, not referenced by any entity) warn
 * - TODO placeholders in message values warn
 */
export function validateLocales(gcf: GcfLike, modRoot: string): LocaleReport {
	const report: LocaleReport = { errors: [], warnings: [] }

	const ns = gcf.package?.namespace
	if (!ns) {
		report.errors.push('package.namespace required for locale validation')
		return report
	}

	const allowedPrefixes = gcf.package?.translates ?? [ns]
	const index: LocaleIndex = new Map()

	for (const decl of gcf.locales ?? []) {
		const content = readLocaleFile(decl, modRoot, report)
		if (content === null) continue

		const ast = parseLocale(decl, content, report)
		if (ast === null) continue

		const keys = collectKeys(decl, ast, allowedPrefixes, report)
		index.set(decl.lang, keys)
	}

	// translation mods only need prefix validation, not entity-derived key checks
	if (gcf.package?.translates) return report

	const { required, optional } = expectedKeysFromGcf(gcf as any)

	checkExpectedKeys(required, index, 'error', report)
	checkExpectedKeys(optional, index, 'warning', report)
	checkOrphans(gcf, required, optional, index, report)

	return report
}

// ---------------------------------------------------------------------------
// phase 1: read file from disk and run cheap pre-parse checks
// ---------------------------------------------------------------------------

interface LocaleDecl {
	lang: string
	path: string
}

function readLocaleFile(decl: LocaleDecl, modRoot: string, report: LocaleReport): string | null {
	const absPath = resolve(modRoot, decl.path)

	let raw: Buffer
	try {
		raw = readFileSync(absPath)
	} catch {
		report.errors.push(`locale file declared but not found: ${decl.path}`)
		return null
	}

	if (hasBom(raw)) {
		report.errors.push(`${decl.path}: file starts with a BOM - save as utf-8 without BOM`)
		return null
	}

	if (looksLikeUtf16(raw)) {
		report.errors.push(`${decl.path}: file appears to be utf-16 - save as utf-8`)
		return null
	}

	const content = raw.toString('utf-8')

	const tabLine = findTabIndentLine(content)
	if (tabLine !== null) {
		report.errors.push(`${decl.path}: tab indentation on line ${tabLine} - fluent requires spaces`)
		return null
	}

	return content
}

// utf-8 BOM is EF BB BF
function hasBom(buf: Buffer): boolean {
	if (buf.length < 3) return false
	return buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf
}

// utf-16 BOMs are FF FE (LE) or FE FF (BE)
function looksLikeUtf16(buf: Buffer): boolean {
	if (buf.length < 2) return false
	return (buf[0] === 0xff && buf[1] === 0xfe) || (buf[0] === 0xfe && buf[1] === 0xff)
}

// returns 1-based line number of the first tab-indented line, or null if none
function findTabIndentLine(content: string): number | null {
	const lines = content.split('\n')
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].startsWith('\t')) return i + 1
	}
	return null
}

// ---------------------------------------------------------------------------
// phase 2: parse via fluent and detect parse failures
// ---------------------------------------------------------------------------

function parseLocale(decl: LocaleDecl, content: string, report: LocaleReport): Resource | null {
	const ast = parse(content, {})

	// fluent never throws - it returns Junk nodes for syntax errors.
	// if there's only junk and zero messages, the file is effectively broken
	const messages = ast.body.filter(e => e.type === 'Message').length
	const junk = ast.body.filter(e => (e as any).type === 'Junk').length

	if (messages === 0 && junk > 0) {
		report.errors.push(`${decl.path}: no valid messages parsed - check fluent syntax`)
		return null
	}

	return ast
}

// ---------------------------------------------------------------------------
// phase 3: walk ast and build the per-language key index
// ---------------------------------------------------------------------------

function collectKeys(
	decl: LocaleDecl,
	ast: Resource,
	allowedPrefixes: string[],
	report: LocaleReport,
): Set<string> {
	const keys = new Set<string>()

	for (const entry of ast.body) {
		if (entry.type !== 'Message') continue
		const msgId = (entry as any).id.name as string

		if (!hasAllowedPrefix(msgId, allowedPrefixes)) {
			const allowed = allowedPrefixes.map(p => `${p}-`).join(', ')
			report.errors.push(`${decl.path}: key "${msgId}" must start with one of: ${allowed}`)
			continue
		}

		if (hasTodo(entry)) {
			report.warnings.push(`${decl.path}: key "${msgId}" still has a TODO placeholder`)
		}

		// bare msgId is only treated as a real key if the message has its own value.
		// attribute-only messages (foo =\n  .name = ...) are containers - they
		// must not trigger orphan checks just because no entity expects "foo"
		if ((entry as any).value !== null) {
			keys.add(msgId)
		}

		for (const attr of (entry as any).attributes ?? []) {
			keys.add(`${msgId}.${attr.id.name}`)
		}
	}

	return keys
}

function hasAllowedPrefix(msgId: string, allowedPrefixes: string[]): boolean {
	return allowedPrefixes.some(p => msgId.startsWith(`${p}-`))
}

// looks for the literal substring "TODO" anywhere in the message value or attributes
function hasTodo(entry: any): boolean {
	const check = (pattern: any): boolean =>
		pattern?.elements?.some(
			(el: any) => el.type === 'TextElement' && String(el.value).includes('TODO'),
		) ?? false

	if (check(entry.value)) return true
	return (entry.attributes ?? []).some((a: any) => check(a.value))
}

// ---------------------------------------------------------------------------
// phase 4: check required/optional keys are covered by at least one language
// ---------------------------------------------------------------------------

function checkExpectedKeys(
	expected: Map<string, string>,
	index: LocaleIndex,
	level: 'error' | 'warning',
	report: LocaleReport,
): void {
	const langs = [...index.keys()]
	if (langs.length === 0) return

	for (const [key, owner] of expected) {
		const present = langs.filter(l => index.get(l)!.has(key))

		if (present.length === 0) {
			const msg = `${owner}: key "${key}" missing from all locale files`
			if (level === 'error') report.errors.push(msg)
			else report.warnings.push(msg)
		} else if (present.length < langs.length) {
			const missing = langs.filter(l => !present.includes(l))
			report.warnings.push(`${owner}: key "${key}" missing from: ${missing.join(', ')}`)
		}
	}
}

// ---------------------------------------------------------------------------
// phase 5: find keys in ftl that no entity references
// ---------------------------------------------------------------------------

function checkOrphans(
	gcf: GcfLike,
	required: Map<string, string>,
	optional: Map<string, string>,
	index: LocaleIndex,
	report: LocaleReport,
): void {
	const known = new Set<string>([...required.keys(), ...optional.keys()])
	collectExplicitKeys(gcf, known)

	for (const [lang, keys] of index) {
		for (const key of keys) {
			if (isOrphan(key, known)) {
				report.warnings.push(`locales/${lang}.ftl: orphan key "${key}"`)
			}
		}
	}
}

// a key is orphan when neither it nor its base (without the attribute suffix) is expected
function isOrphan(key: string, known: Set<string>): boolean {
	if (known.has(key)) return false
	const dot = key.indexOf('.')
	if (dot === -1) return true
	const base = key.slice(0, dot)
	return !known.has(base)
}

// walk the gcf tree and pull every explicit { key: '...' } reference so they
// don't get flagged as orphan
function collectExplicitKeys(value: unknown, into: Set<string>): void {
	if (!value || typeof value !== 'object') return

	if (Array.isArray(value)) {
		for (const v of value) collectExplicitKeys(v, into)
		return
	}

	const obj = value as Record<string, unknown>
	if (typeof obj.key === 'string' && Object.keys(obj).length === 1) {
		into.add(obj.key)
		return
	}

	for (const v of Object.values(obj)) collectExplicitKeys(v, into)
}
