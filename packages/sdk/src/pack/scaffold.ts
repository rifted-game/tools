import { parse } from '@fluent/syntax'

import { cardKey } from '../locales/keys'

import { expectedKeysFromGcf } from './expected-keys'

/**
 * Generate or extend an ftl file with stubs for missing localization keys.
 *
 * Existing translation strings are never modified - only the auto-generated
 * "available variables" hint comments are refreshed when params change.
 * New blocks are appended at the end with TODO placeholders.
 */
export function scaffoldFtl(opts: { gcf: object; existingFtl?: string; lang: string }): string {
	const { gcf, existingFtl, lang } = opts

	const paramsByMsgId = collectParamHints(gcf)
	const expectedKeys = collectExpectedKeys(gcf)
	const existingKeys = readExistingKeys(existingFtl)

	// in-place hint refresh for blocks already present in the file
	const refreshed = refreshHints(existingFtl ?? '', expectedKeys, paramsByMsgId)

	// append new blocks for keys that don't exist yet
	const missingBlocks = buildMissingBlocks(expectedKeys, existingKeys, paramsByMsgId)
	if (missingBlocks.length === 0) return refreshed

	const tail = renderBlocks(missingBlocks, { lang, isNewFile: existingFtl === undefined })
	return refreshed + tail
}

// ---------------------------------------------------------------------------
// types
// ---------------------------------------------------------------------------

interface Block {
	msgId: string
	hasValue: boolean
	attrs: string[]
	// names of ftl variables available to this message - rendered as a hint comment
	params: string[]
}

interface RenderContext {
	lang: string
	isNewFile: boolean
}

const HINT_PREFIX = '# available variables:'

// ---------------------------------------------------------------------------
// phase 1: walk gcf to gather expected keys and param hints
// ---------------------------------------------------------------------------

function collectExpectedKeys(gcf: object): Map<string, string> {
	const { required, optional } = expectedKeysFromGcf(gcf as any)
	return new Map([...required, ...optional])
}

// at the moment only card params are considered. buffs and others can be added
// here without changing call sites
function collectParamHints(gcf: object): Map<string, string[]> {
	const out = new Map<string, string[]>()
	const cards = (gcf as any).cards ?? []
	for (const card of cards) {
		if (!card.params) continue
		out.set(cardKey(card.id), Object.keys(card.params))
	}
	return out
}

// ---------------------------------------------------------------------------
// phase 2: parse existing ftl to know which keys are already declared
// ---------------------------------------------------------------------------

function readExistingKeys(existingFtl: string | undefined): Set<string> {
	const keys = new Set<string>()
	if (!existingFtl) return keys

	const ast = parse(existingFtl, {})
	for (const entry of ast.body) {
		if (entry.type !== 'Message') continue
		const id = (entry as any).id.name as string
		keys.add(id)
		for (const attr of (entry as any).attributes ?? []) {
			keys.add(`${id}.${attr.id.name}`)
		}
	}
	return keys
}

// ---------------------------------------------------------------------------
// phase 3: refresh hint comments in-place for existing blocks
// ---------------------------------------------------------------------------

/**
 * For each Message in the existing ftl that has params declared in gcf, ensure
 * the hint comment matches the current params. Translation strings themselves
 * are never modified.
 */
function refreshHints(
	source: string,
	expectedKeys: Map<string, string>,
	paramsByMsgId: Map<string, string[]>,
): string {
	if (source.length === 0) return source

	const ast = parse(source, {})
	const edits: Edit[] = []

	for (const entry of ast.body) {
		if (entry.type !== 'Message') continue
		const msgId = (entry as any).id.name as string

		// only refresh hints for keys we actually know about - leaves user-authored
		// messages and translation-mod overrides untouched
		if (!expectedKeys.has(msgId) && !expectedKeyForBase(expectedKeys, msgId)) continue

		const params = paramsByMsgId.get(msgId) ?? []
		const expectedHint = renderHintLine(params)
		const currentHint = extractAttachedHint(entry)

		if (currentHint === expectedHint) continue

		edits.push(planHintEdit(entry, currentHint, expectedHint))
	}

	return applyEdits(source, edits)
}

// expectedKeys uses fully-qualified keys ("foo-card-bar.name"); messages are
// indexed by their base id ("foo-card-bar"). check if any expected key has
// this message id as its base
function expectedKeyForBase(expectedKeys: Map<string, string>, msgId: string): boolean {
	const prefix = `${msgId}.`
	for (const key of expectedKeys.keys()) {
		if (key.startsWith(prefix)) return true
	}
	return false
}

// returns the hint comment content (without the leading "# ") attached to this
// message, or null if no hint comment is attached
function extractAttachedHint(entry: any): string | null {
	const comment = entry.comment
	if (!comment) return null
	const text = String(comment.content ?? '')
	if (!text.startsWith('available variables:')) return null
	return `# ${text}`
}

function renderHintLine(params: string[]): string | null {
	if (params.length === 0) return null
	const vars = params.map(p => `{ $${p} }`).join('  ')
	return `${HINT_PREFIX} ${vars}`
}

// ---------------------------------------------------------------------------
// phase 4: edit primitives - represent text mutations and apply them at the end
// ---------------------------------------------------------------------------

// edits are computed against the original source span, then sorted descending
// by start so each splice doesn't shift indices of later edits
interface Edit {
	start: number
	end: number
	replacement: string
}

function planHintEdit(entry: any, currentHint: string | null, expectedHint: string | null): Edit {
	const messageStart = entry.span.start as number
	const comment = entry.comment

	// no current hint - insert before the message
	if (!currentHint) {
		return {
			start: messageStart,
			end: messageStart,
			replacement: `${expectedHint}\n`,
		}
	}

	const commentStart = comment.span.start as number
	const commentEnd = comment.span.end as number

	// current hint should be removed entirely (params no longer exist)
	if (!expectedHint) {
		// include the trailing newline if there is one
		return {
			start: commentStart,
			end: commentEnd + 1,
			replacement: '',
		}
	}

	// replace the hint comment content
	return {
		start: commentStart,
		end: commentEnd,
		replacement: expectedHint,
	}
}

function applyEdits(source: string, edits: Edit[]): string {
	if (edits.length === 0) return source

	// apply from end to start so earlier offsets remain valid
	const sorted = [...edits].sort((a, b) => b.start - a.start)
	let result = source
	for (const edit of sorted) {
		result = result.slice(0, edit.start) + edit.replacement + result.slice(edit.end)
	}
	return result
}

// ---------------------------------------------------------------------------
// phase 5: compute which message blocks need stubs and group attributes by message id
// ---------------------------------------------------------------------------

function buildMissingBlocks(
	expectedKeys: Map<string, string>,
	existingKeys: Set<string>,
	paramsByMsgId: Map<string, string[]>,
): Block[] {
	const blocks = new Map<string, Block>()

	for (const fullKey of expectedKeys.keys()) {
		if (existingKeys.has(fullKey)) continue

		const { msgId, attr } = splitKey(fullKey)
		const block = ensureBlock(blocks, msgId, paramsByMsgId)

		if (attr === null) block.hasValue = true
		else block.attrs.push(attr)
	}

	return [...blocks.values()].sort((a, b) => (a.msgId < b.msgId ? -1 : 1))
}

function splitKey(fullKey: string): { msgId: string; attr: string | null } {
	const dot = fullKey.indexOf('.')
	if (dot === -1) return { msgId: fullKey, attr: null }
	return { msgId: fullKey.slice(0, dot), attr: fullKey.slice(dot + 1) }
}

function ensureBlock(
	blocks: Map<string, Block>,
	msgId: string,
	paramsByMsgId: Map<string, string[]>,
): Block {
	const existing = blocks.get(msgId)
	if (existing) return existing

	const block: Block = {
		msgId,
		hasValue: false,
		attrs: [],
		params: paramsByMsgId.get(msgId) ?? [],
	}
	blocks.set(msgId, block)
	return block
}

// ---------------------------------------------------------------------------
// phase 6: render new blocks as ftl text
// ---------------------------------------------------------------------------

function renderBlocks(blocks: Block[], ctx: RenderContext): string {
	const lines: string[] = []
	appendHeader(lines, ctx)

	let currentKind: string | null = null
	for (const block of blocks) {
		const kind = kindFromKey(block.msgId)
		if (kind !== currentKind) {
			lines.push(`# -- ${kind} --`)
			lines.push('')
			currentKind = kind
		}
		appendBlock(lines, block)
	}

	return lines.join('\n')
}

function appendHeader(lines: string[], ctx: RenderContext): void {
	if (ctx.isNewFile) {
		lines.push(`# auto-generated by rifted locales:scaffold (lang=${ctx.lang})`)
		lines.push('# fill in the TODO entries before packing')
		lines.push('')
		return
	}

	// extending an existing file - leave a separator so the new block reads as a continuation
	lines.push('')
	lines.push('')
	lines.push(`# auto-generated stubs (lang=${ctx.lang})`)
	lines.push('')
}

function appendBlock(lines: string[], block: Block): void {
	const hint = renderHintLine(block.params)
	if (hint) lines.push(hint)

	if (block.hasValue) {
		lines.push(`${block.msgId} = TODO ${displayName(block.msgId)}`)
	} else {
		lines.push(`${block.msgId} =`)
	}

	for (const attr of [...block.attrs].sort()) {
		lines.push(`    .${attr} = TODO`)
	}

	lines.push('')
}

// my_mod-card-rage -> "card"
function kindFromKey(msgId: string): string {
	return msgId.split('-')[1] ?? 'misc'
}

// my_mod-card-rage -> "Rage"
function displayName(msgId: string): string {
	const parts = msgId.split('-')
	const name = parts.slice(2).join(' ')
	if (!name) return msgId
	return name.charAt(0).toUpperCase() + name.slice(1)
}
