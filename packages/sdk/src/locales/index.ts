// Localization layer. The engine carries NO strings — GCF has a strict field
// whitelist and the client derives fluent keys from definition ids
// (vanilla:strike → card-vanilla-strike). Names and descriptions are
// therefore an SDK/CLI concern: inline texts on definitions compile into
// .ftl files next to gcf.json, render bindings become fluent variables
// ({ $dmg }), and hand-written .ftl files always win over generated stubs.
//
// Three ways to give a definition a string:
//   name: 'Strike'                        — text in the package default locale
//   name: { en: 'Strike', ru: 'Удар' }    — per-locale texts
//   name: { key: 'shared-strike.name' }   — alias another fluent message:
//     emitted as `.name = { shared-strike.name }`, so the client still looks
//     up the id-derived key and fluent resolves the reference. No engine or
//     client changes needed.

import { parse } from '@fluent/syntax'
import { RiftedBuildError } from '../core/scope'

/** a localizable text: default-locale string, per-locale map, or a key alias */
export type LocText = string | { key: string } | Record<string, string>

/** one localizable definition: a fluent message with .name/.description */
export interface LocEntry {
	/** fluent message id derived from the definition: "card-ex-strike" */
	id: string
	/** context comment for translators (kind, id, params, render variables) */
	comment: string
	attrs: Record<string, LocText>
}

const MESSAGE_ID_RE = /^[a-zA-Z][a-zA-Z0-9_-]*$/
const KEY_REF_RE = /^[a-zA-Z][a-zA-Z0-9_-]*(\.[a-zA-Z][a-zA-Z0-9_-]*)?$/

export function locMessageId(kind: string, namespace: string, id: string): string {
	// [a-z0-9_] ids may start with a digit; the kind prefix guarantees a letter
	return `${kind}-${namespace}-${id}`.replaceAll('_', '-')
}

function isKeyRef(t: LocText): t is { key: string } {
	return typeof t === 'object' && 'key' in t && typeof t.key === 'string'
}

/** locales mentioned by an entry's texts ('' marks the default locale) */
function localesOf(t: LocText): string[] {
	if (typeof t === 'string') return ['']
	if (isKeyRef(t)) return []
	return Object.keys(t)
}

function textFor(t: LocText, locale: string, defaultLocale: string): string | undefined {
	if (typeof t === 'string') return locale === defaultLocale ? t : undefined
	if (isKeyRef(t)) return undefined
	return t[locale]
}

/**
 * render a value, indenting continuation lines (fluent multiline blocks).
 * Texts are fluent snippets verbatim — placeables like { $dmg } and
 * selectors pass through; the generated message is parse-checked below
 */
function ftlValue(text: string): string {
	if (!text.includes('\n')) return text
	return `\n        ${text.split('\n').join('\n        ')}`
}

function renderMessage(
	entry: LocEntry,
	attrText: (attr: string, t: LocText) => string | undefined,
): string | null {
	const lines: string[] = []
	for (const [attr, t] of Object.entries(entry.attrs)) {
		const value = attrText(attr, t)
		if (value !== undefined) lines.push(`    .${attr} = ${value}`)
	}
	if (lines.length === 0) return null
	const block = `# ${entry.comment}\n${entry.id} =\n${lines.join('\n')}`
	// author texts are fluent syntax: catch broken placeables at build time
	const errors = ftlSyntaxErrors(block)
	if (errors.length > 0) {
		throw new RiftedBuildError(
			`locales: ${entry.id}: text is not valid fluent syntax:\n${errors.join('\n')}`,
		)
	}
	return block
}

/** ids (and their attributes) already present in a hand-written .ftl */
function presentIds(ftl: string): Map<string, Set<string>> {
	const out = new Map<string, Set<string>>()
	const res = parse(ftl, { withSpans: false })
	for (const item of res.body) {
		if (item.type !== 'Message') continue
		const attrs = new Set<string>()
		for (const a of item.attributes) attrs.add(a.id.name)
		out.set(item.id.name, attrs)
	}
	return out
}

/** syntax errors in a hand-written .ftl (fluent parses junk into Junk nodes) */
export function ftlSyntaxErrors(ftl: string): string[] {
	const res = parse(ftl, { withSpans: true })
	const out: string[] = []
	for (const item of res.body) {
		if (item.type === 'Junk') {
			for (const ann of item.annotations) out.push(`${ann.code}: ${ann.message}`)
		}
	}
	return out
}

export interface MissingString {
	/** fluent message id, e.g. "card-ex-strike" */
	id: string
	attr: string
	/** translator context from the entry's auto-comment */
	comment: string
}

export interface LocalesBuild {
	/** locales referenced by inline texts (default locale included when any exist) */
	locales: string[]
	/** final .ftl for a locale: hand-written content + generated tail (hand wins) */
	ftl(locale: string, handwritten?: string): string | null
	/** stub block for keys missing from an existing file; null if complete */
	scaffold(locale: string, existing?: string): string | null
	/** strings with no text for a locale: not inline, not hand-written, not aliased */
	missing(locale: string, handwritten?: string): MissingString[]
	entries: LocEntry[]
	defaultLocale: string
}

export function buildLocales(entries: LocEntry[], defaultLocale: string): LocalesBuild {
	// validate entries early: bad ids/keys are author bugs, not translator bugs
	const seen = new Set<string>()
	for (const e of entries) {
		if (!MESSAGE_ID_RE.test(e.id)) {
			throw new RiftedBuildError(`locales: bad fluent message id "${e.id}"`)
		}
		if (seen.has(e.id)) throw new RiftedBuildError(`locales: duplicate message id "${e.id}"`)
		seen.add(e.id)
		for (const [attr, t] of Object.entries(e.attrs)) {
			if (isKeyRef(t) && !KEY_REF_RE.test(t.key)) {
				throw new RiftedBuildError(
					`locales: ${e.id}.${attr}: bad key reference "${t.key}" (expected "message" or "message.attr")`,
				)
			}
		}
	}

	const locales = new Set<string>()
	for (const e of entries) {
		for (const [, t] of Object.entries(e.attrs)) {
			for (const l of localesOf(t)) locales.add(l === '' ? defaultLocale : l)
		}
	}

	const generated = (locale: string, skip: Map<string, Set<string>>): string[] => {
		const blocks: string[] = []
		for (const e of entries) {
			// a hand-written message wins wholesale: translators own that file
			if (skip.has(e.id)) continue
			const block = renderMessage(e, (_attr, t) => {
				if (isKeyRef(t)) return `{ ${t.key} }`
				const text = textFor(t, locale, defaultLocale)
				return text === undefined ? undefined : ftlValue(text)
			})
			if (block) blocks.push(block)
		}
		return blocks
	}

	return {
		locales: [...locales].sort(),
		entries,
		defaultLocale,

		ftl(locale, handwritten) {
			const skip = handwritten ? presentIds(handwritten) : new Map<string, Set<string>>()
			const blocks = generated(locale, skip)
			const hand = handwritten?.trimEnd()
			if (!hand && blocks.length === 0) return null
			const parts: string[] = []
			if (hand) parts.push(hand)
			if (blocks.length > 0) {
				parts.push(`## Generated from inline strings — edit the source, not this section.`)
				parts.push(blocks.join('\n\n'))
			}
			return `${parts.join('\n\n')}\n`
		},

		scaffold(locale, existing) {
			const have = existing ? presentIds(existing) : new Map<string, Set<string>>()
			const blocks: string[] = []
			for (const e of entries) {
				const haveAttrs = have.get(e.id)
				const block = renderMessage(e, (attr, t) => {
					if (haveAttrs?.has(attr)) return undefined
					if (isKeyRef(t)) return `{ ${t.key} }`
					// placeholder: default-locale text if known, else a TODO marker
					const fallback = textFor(t, defaultLocale, defaultLocale)
					const text = textFor(t, locale, defaultLocale) ?? fallback
					return text === undefined ? `TODO (${attr})` : ftlValue(text)
				})
				if (block) blocks.push(block)
			}
			return blocks.length > 0 ? `${blocks.join('\n\n')}\n` : null
		},

		missing(locale, handwritten) {
			const have = handwritten ? presentIds(handwritten) : new Map<string, Set<string>>()
			const out: MissingString[] = []
			for (const e of entries) {
				const haveAttrs = have.get(e.id)
				for (const [attr, t] of Object.entries(e.attrs)) {
					if (haveAttrs?.has(attr)) continue
					if (isKeyRef(t)) continue // aliases resolve in every locale
					if (textFor(t, locale, defaultLocale) !== undefined) continue
					out.push({ id: e.id, attr, comment: e.comment })
				}
			}
			return out
		},
	}
}
