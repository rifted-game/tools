import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { parse } from '@fluent/syntax'

import { expectedKeysFromGcf } from './expected-keys'

export interface LocaleReport {
	errors: string[]
	warnings: string[]
}

interface GcfLike {
	package?: { namespace?: string; translates?: string[] }
	locales?: Array<{ lang: string; path: string }>
}

/**
 * Validates the locale layer of a mod.
 *
 * Checks:
 * - declared ftl files exist on disk
 * - every message id is prefixed by the mod namespace (or a namespace from `translates`)
 * - required keys (card.name, buff.description, ...) are present in at least one language
 * - optional keys (encounter.title, ...) warn when missing
 * - keys missing from some but not all languages warn
 * - orphan keys (in ftl, not referenced by any entity) warn
 * - TODO placeholders in message values warn
 */
export function validateLocales(gcf: GcfLike, modRoot: string): LocaleReport {
	const errors: string[] = []
	const warnings: string[] = []

	const ns = gcf.package?.namespace
	if (!ns) {
		errors.push('package.namespace required for locale validation')
		return { errors, warnings }
	}

	const allowedPrefixes = gcf.package?.translates ?? [ns]

	// lang → set of "message-id" and "message-id.attribute"
	const index = new Map<string, Set<string>>()

	for (const decl of gcf.locales ?? []) {
		const absPath = resolve(modRoot, decl.path)
		let content: string
		try {
			content = readFileSync(absPath, 'utf-8')
		} catch {
			errors.push(`locale file declared but not found: ${decl.path}`)
			continue
		}

		const ast = parse(content, {})
		const keys = new Set<string>()

		for (const entry of ast.body) {
			if (entry.type !== 'Message') continue
			const msgId = (entry as any).id.name as string

			const ok = allowedPrefixes.some(p => msgId.startsWith(`${p}-`))
			if (!ok) {
				errors.push(
					`${decl.path}: key "${msgId}" must start with one of: ${allowedPrefixes.map(p => `${p}-`).join(', ')}`,
				)
				continue
			}

			if (hasTodo(entry)) {
				warnings.push(`${decl.path}: key "${msgId}" still has a TODO placeholder`)
			}

			keys.add(msgId)
			for (const attr of (entry as any).attributes ?? []) {
				keys.add(`${msgId}.${attr.id.name}`)
			}
		}

		index.set(decl.lang, keys)
	}

	// translation mods only need prefix validation, not entity-derived key checks
	if (gcf.package?.translates) return { errors, warnings }

	const { required, optional } = expectedKeysFromGcf(gcf as any)
	const langs = [...index.keys()]

	const check = (key: string, owner: string, level: 'error' | 'warning') => {
		const present = langs.filter(l => index.get(l)!.has(key))
		if (present.length === 0) {
			const msg = `${owner}: key "${key}" missing from all locale files`
			;(level === 'error' ? errors : warnings).push(msg)
		} else if (present.length < langs.length) {
			const missing = langs.filter(l => !present.includes(l))
			warnings.push(`${owner}: key "${key}" missing from: ${missing.join(', ')}`)
		}
	}

	for (const [k, owner] of required) check(k, owner, 'error')
	for (const [k, owner] of optional) check(k, owner, 'warning')

	// orphan keys: in ftl but not expected by any entity
	const known = new Set<string>([...required.keys(), ...optional.keys()])
	collectExplicitKeys(gcf, known)

	for (const [lang, keys] of index) {
		for (const k of keys) {
			const base = k.includes('.') ? k.slice(0, k.indexOf('.')) : k
			if (!known.has(k) && !known.has(base)) {
				warnings.push(`locales/${lang}.ftl: orphan key "${k}"`)
			}
		}
	}

	return { errors, warnings }
}

// walk the gcf tree collecting every { key: '...' } reference so they don't
// get flagged as orphans
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

function hasTodo(entry: any): boolean {
	const check = (pattern: any): boolean =>
		pattern?.elements?.some(
			(el: any) => el.type === 'TextElement' && String(el.value).includes('TODO'),
		) ?? false

	if (check(entry.value)) return true
	return (entry.attributes ?? []).some((a: any) => check(a.value))
}
