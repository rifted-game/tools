// Op-level validation of GCF expression trees. The zod schema checks the
// shape of definitions; this walker mirrors the engine loader's op tables
// (gcf_expr.go) so a hand-written document fails here with the same class of
// errors — unknown op with did-you-mean, wrong arity, wrong argument kind —
// instead of at engine load time.
//
// The tables are maintained by hand against the engine; the SDK itself can
// only emit ops listed here, so equivalence tests keep them honest.

import { STATE_LEVELS, TARGETS } from '../core/dict'
import { BUILTIN_EVENTS } from '../core/events'

type ArgKind =
	| 'value'
	| 'cond'
	| 'effect'
	| 'string'
	| 'target'
	| 'state_level'
	| 'who'
	| 'bindings'
	| 'payload'
	| 'event'
	| 'intent'
	| 'hooks'
	// definition references — collected for the integrity check
	| 'modifier_ref'
	| 'affinity_ref'
	| 'watcher_ref'

interface OpSig {
	/** human-readable signature for error messages */
	sig: string
	min: number
	/** -1 = variadic */
	max: number
	/** argument kinds; past the end the last kind repeats */
	args: ArgKind[]
}

function op(sig: string, min: number, max: number, ...args: ArgKind[]): OpSig {
	return { sig, min, max, args }
}

const VALUE_OPS: Record<string, OpSig> = {
	add: op('add(a, b)', 2, 2, 'value'),
	sub: op('sub(a, b)', 2, 2, 'value'),
	mul: op('mul(a, b)', 2, 2, 'value'),
	div: op('div(a, b)', 2, 2, 'value'),
	mod: op('mod(a, b)', 2, 2, 'value'),
	min: op('min(values...)', 1, -1, 'value'),
	max: op('max(values...)', 1, -1, 'value'),
	scale: op('scale(inner)', 1, 1, 'value'),
	floor: op('floor(v)', 1, 1, 'value'),
	ceil: op('ceil(v)', 1, 1, 'value'),
	round: op('round(v)', 1, 1, 'value'),
	abs: op('abs(v)', 1, 1, 'value'),
	clamp: op('clamp(v, lo, hi)', 3, 3, 'value'),
	if: op('if(cond, then, else)', 3, 3, 'cond', 'value', 'value'),
	let: op('let({bindings}, in)', 2, 2, 'bindings', 'value'),
	rand_int: op('rand_int(lo, hi)', 2, 2, 'value'),
}

const COND_OPS: Record<string, OpSig> = {
	lt: op('lt(a, b)', 2, 2, 'value'),
	gt: op('gt(a, b)', 2, 2, 'value'),
	lte: op('lte(a, b)', 2, 2, 'value'),
	gte: op('gte(a, b)', 2, 2, 'value'),
	eq: op('eq(a, b)', 2, 2, 'value'),
	neq: op('neq(a, b)', 2, 2, 'value'),
	and: op('and(conds...)', 1, -1, 'cond'),
	or: op('or(conds...)', 1, -1, 'cond'),
	not: op('not(cond)', 1, 1, 'cond'),
	has_tag: op('has_tag(tag)', 1, 1, 'string'),
	attached_to: op('attached_to(affinity_id)', 1, 1, 'affinity_ref'),
	spend_player_state: op('spend_player_state(key, amount)', 2, 2, 'string', 'value'),
}

const EFFECT_OPS: Record<string, OpSig> = {
	damage: op('damage(target, amount)', 2, 2, 'target', 'value'),
	heal: op('heal(target, amount)', 2, 2, 'target', 'value'),
	block: op('block(amount)', 1, 1, 'value'),
	self_damage: op('self_damage(amount)', 1, 1, 'value'),
	damage_add: op('damage_add(amount)', 1, 1, 'value'),
	damage_mul: op('damage_mul(factor)', 1, 1, 'value'),
	damage_override: op('damage_override(amount)', 1, 1, 'value'),
	shrink_hand: op('shrink_hand(n)', 1, 1, 'value'),
	replay_card: op('replay_card(times)', 1, 1, 'value'),
	add_card_stack: op('add_card_stack(n)', 1, 1, 'value'),
	replay_last: op('replay_last(botch, botch_per_stack)', 2, 2, 'value'),
	seq: op('seq(effects...)', 0, -1, 'effect'),
	if: op('if(cond, then, else?)', 2, 3, 'cond', 'effect', 'effect'),
	chance: op('chance(p, then, else?)', 2, 3, 'value', 'effect', 'effect'),
	let: op('let({bindings}, effect)', 2, 2, 'bindings', 'effect'),
	add_state: op('add_state(level, key, amount)', 3, 3, 'state_level', 'string', 'value'),
	set_state: op('set_state(level, key, value)', 3, 3, 'state_level', 'string', 'value'),
	reduce_cooldowns: op('reduce_cooldowns(n, tags...)', 1, -1, 'value', 'string'),
	apply_mod: op('apply_mod(self|target, mod_id, stack)', 3, 3, 'who', 'modifier_ref', 'value'),
	emit: op('emit(event, {payload}?)', 1, 2, 'event', 'payload'),
	summon: op('summon(hp, intent?, hooks?)', 1, 3, 'value', 'intent', 'hooks'),
	set_affinity: op('set_affinity(affinity_id)', 1, 1, 'affinity_ref'),
	start_watcher: op('start_watcher(watcher_id)', 1, 1, 'watcher_ref'),
	start_watcher_on: op('start_watcher_on(watcher_id)', 1, 1, 'watcher_ref'),
	start_card_watcher: op('start_card_watcher(watcher_id)', 1, 1, 'watcher_ref'),
	start_card_reveal: op('start_card_reveal(watcher_id)', 1, 1, 'watcher_ref'),
	finish_watcher: op('finish_watcher(watcher_id)', 1, 1, 'watcher_ref'),
	noop: op('noop()', 0, 0),
}

// --- did-you-mean (mirrors the engine's loader) ---

function levenshtein(a: string, b: string): number {
	if (a.length > b.length) [a, b] = [b, a]
	let prev = Array.from({ length: a.length + 1 }, (_, i) => i)
	for (let j = 1; j <= b.length; j++) {
		const cur = [j]
		for (let i = 1; i <= a.length; i++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1
			cur[i] = Math.min(cur[i - 1] + 1, prev[i] + 1, prev[i - 1] + cost)
		}
		prev = cur
	}
	return prev[a.length]
}

function didYouMean(got: string, known: Iterable<string>): string {
	let best = ''
	let dist = 3
	for (const k of known) {
		const d = levenshtein(got, k)
		if (d < dist) {
			best = k
			dist = d
		}
	}
	return best ? ` (did you mean "${best}"?)` : ''
}

// --- the walker ---

export interface OpIssue {
	path: string
	message: string
}

/** which document section a reference points into */
export type RefSection =
	| 'cards'
	| 'modifiers'
	| 'enemies'
	| 'watchers'
	| 'encounters'
	| 'affinities'

export interface DocRef {
	section: RefSection
	id: string
	path: string
}

const REF_SECTION: Record<'modifier_ref' | 'affinity_ref' | 'watcher_ref', RefSection> = {
	modifier_ref: 'modifiers',
	affinity_ref: 'affinities',
	watcher_ref: 'watchers',
}

class Walker {
	readonly issues: OpIssue[] = []
	readonly refs: DocRef[] = []

	ref(section: RefSection, id: unknown, path: string): void {
		if (typeof id !== 'string' || id === '') {
			this.fail(path, 'expected a definition id')
			return
		}
		// qualified ids point at other documents — the engine checks those
		if (!id.includes(':')) this.refs.push({ section, id, path })
	}

	fail(path: string, message: string): void {
		this.issues.push({ path, message })
	}

	value(node: unknown, path: string): void {
		if (typeof node === 'number' || typeof node === 'string') return
		this.sexpr(node, path, VALUE_OPS, 'value')
	}

	cond(node: unknown, path: string): void {
		if (typeof node === 'boolean') return
		this.sexpr(node, path, COND_OPS, 'condition')
	}

	effect(node: unknown, path: string): void {
		if (node === null || node === undefined) return
		if (!Array.isArray(node) || node.length === 0) {
			this.fail(path, 'expected an effect: ["op", args...] or [[...],[...]] for a sequence')
			return
		}
		if (typeof node[0] !== 'string') {
			// implicit sequence
			for (const [i, e] of node.entries()) this.effect(e, `${path}[${i}]`)
			return
		}
		this.sexpr(node, path, EFFECT_OPS, 'effect')
	}

	private sexpr(
		node: unknown,
		path: string,
		ops: Record<string, OpSig>,
		what: 'value' | 'condition' | 'effect',
	): void {
		if (!Array.isArray(node) || node.length === 0 || typeof node[0] !== 'string') {
			this.fail(path, `expected a ${what} expression: ["op", args...]`)
			return
		}
		const [head, ...args] = node as [string, ...unknown[]]
		const sig = ops[head]
		if (!sig) {
			this.fail(path, `unknown ${what} op "${head}"${didYouMean(head, Object.keys(ops))}`)
			return
		}
		if (args.length < sig.min || (sig.max >= 0 && args.length > sig.max)) {
			this.fail(path, `${head}: got ${args.length} args, want ${sig.sig}`)
			return
		}
		args.forEach((arg, i) => {
			const kind = sig.args[Math.min(i, sig.args.length - 1)]
			this.arg(arg, kind, `${path}.${head}[${i}]`)
		})
	}

	private arg(arg: unknown, kind: ArgKind, path: string): void {
		switch (kind) {
			case 'value':
				this.value(arg, path)
				return
			case 'cond':
				this.cond(arg, path)
				return
			case 'effect':
				this.effect(arg, path)
				return
			case 'string':
				if (typeof arg !== 'string' || arg === '') this.fail(path, 'expected a string')
				return
			case 'modifier_ref':
			case 'affinity_ref':
			case 'watcher_ref':
				this.ref(REF_SECTION[kind], arg, path)
				return
			case 'target':
				if (typeof arg !== 'string' || !(TARGETS as ReadonlySet<string>).has(arg)) {
					this.fail(path, `unknown target "${String(arg)}"${didYouMean(String(arg), TARGETS)}`)
				}
				return
			case 'state_level':
				if (typeof arg !== 'string' || !(STATE_LEVELS as ReadonlySet<string>).has(arg)) {
					this.fail(
						path,
						`unknown state level "${String(arg)}"${didYouMean(String(arg), STATE_LEVELS)}`,
					)
				}
				return
			case 'who':
				if (arg !== 'self' && arg !== 'target') {
					this.fail(path, `apply_mod: who="${String(arg)}", want "self" or "target"`)
				}
				return
			case 'event':
				this.event(arg, path)
				return
			case 'bindings':
				if (typeof arg !== 'object' || arg === null || Array.isArray(arg)) {
					this.fail(path, 'let: bindings must be an object')
					return
				}
				for (const [k, v] of Object.entries(arg)) this.value(v, `${path}.${k}`)
				return
			case 'payload':
				if (typeof arg !== 'object' || arg === null || Array.isArray(arg)) {
					this.fail(path, 'emit: payload must be an object')
					return
				}
				for (const [k, v] of Object.entries(arg)) this.value(v, `${path}.${k}`)
				return
			case 'intent':
				this.intent(arg, path)
				return
			case 'hooks':
				if (!Array.isArray(arg)) {
					this.fail(path, 'expected an array of hooks')
					return
				}
				for (const [i, h] of arg.entries()) this.hook(h, `${path}[${i}]`)
				return
		}
	}

	event(kind: unknown, path: string): void {
		if (typeof kind !== 'string' || kind === '') {
			this.fail(path, 'expected an event name')
			return
		}
		if (!(BUILTIN_EVENTS as readonly string[]).includes(kind) && !kind.includes(':')) {
			this.fail(
				path,
				`unknown event "${kind}"${didYouMean(kind, BUILTIN_EVENTS)}; custom events need a namespace`,
			)
		}
	}

	hook(h: unknown, path: string): void {
		if (typeof h !== 'object' || h === null) {
			this.fail(path, 'expected a hook object')
			return
		}
		const hook = h as { on?: unknown; when?: unknown; do?: unknown }
		this.event(hook.on, `${path}.on`)
		if (hook.when !== undefined) this.cond(hook.when, `${path}.when`)
		this.effect(hook.do, `${path}.do`)
	}

	intent(it: unknown, path: string): void {
		if (it === null || it === undefined) return
		if (typeof it !== 'object' || Array.isArray(it)) {
			this.fail(path, 'expected an intent object')
			return
		}
		const intent = it as { amount?: unknown; on_execute?: unknown }
		if (intent.amount !== undefined) this.value(intent.amount, `${path}.amount`)
		if (intent.on_execute !== undefined) this.effect(intent.on_execute, `${path}.on_execute`)
	}

	render(render: unknown, path: string): void {
		if (render === undefined) return
		for (const [k, v] of Object.entries(render as Record<string, unknown>)) {
			this.value(v, `${path}.${k}`)
		}
	}
}

function entries(x: unknown): Array<[number, any]> {
	return Array.isArray(x) ? [...x.entries()] : []
}

export interface DocAnalysis {
	issues: OpIssue[]
	/** every intra-document reference found in expressions and definitions */
	refs: DocRef[]
}

/** walk every expression slot of a (shape-valid) document with the op tables */
export function analyzeDocumentOps(doc: Record<string, unknown>): DocAnalysis {
	const w = new Walker()
	const each = (section: string, fn: (entry: any, path: string) => void) => {
		for (const [i, entry] of entries(doc[section])) fn(entry, `${section}[${i}]`)
	}

	each('cards', (c, p) => {
		if (c.as_modifier !== undefined) w.ref('modifiers', c.as_modifier, `${p}.as_modifier`)
		if (c.affinity !== undefined) w.ref('affinities', c.affinity, `${p}.affinity`)
		if (c.on_play !== undefined) w.effect(c.on_play, `${p}.on_play`)
		for (const [i, h] of entries(c.hooks)) w.hook(h, `${p}.hooks[${i}]`)
		w.render(c.render, `${p}.render`)
	})
	each('modifiers', (m, p) => {
		for (const [i, h] of entries(m.hooks)) w.hook(h, `${p}.hooks[${i}]`)
		w.render(m.render, `${p}.render`)
	})
	each('enemies', (e, p) => {
		for (const [i, h] of entries(e.hooks)) w.hook(h, `${p}.hooks[${i}]`)
		for (const [i, ph] of entries(e.phases)) {
			const pp = `${p}.phases[${i}]`
			if (ph.until !== undefined) w.cond(ph.until, `${pp}.until`)
			if (ph.on_enter !== undefined) w.effect(ph.on_enter, `${pp}.on_enter`)
			for (const [j, s] of entries(ph.steps)) w.intent(s, `${pp}.steps[${j}]`)
			for (const [j, h] of entries(ph.hooks)) w.hook(h, `${pp}.hooks[${j}]`)
		}
	})
	each('watchers', (wd, p) => {
		if (wd.hook) w.hook(wd.hook, `${p}.hook`)
		if (wd.reveal) w.event(wd.reveal.on, `${p}.reveal.on`)
		w.render(wd.render, `${p}.render`)
	})
	each('encounters', (e, p) => {
		for (const [i, id] of entries(e.enemies)) w.ref('enemies', id, `${p}.enemies[${i}]`)
		for (const [i, id] of entries(e.loot)) w.ref('cards', id, `${p}.loot[${i}]`)
	})
	each('maps', (m, p) => {
		for (const [kind, ids] of Object.entries(m.content ?? {})) {
			for (const [i, id] of entries(ids)) w.ref('encounters', id, `${p}.content.${kind}[${i}]`)
		}
	})
	each('affinities', (a, p) => {
		w.render(a.render, `${p}.render`)
	})

	return { issues: w.issues, refs: w.refs }
}

export function checkDocumentOps(doc: Record<string, unknown>): OpIssue[] {
	return analyzeDocumentOps(doc).issues
}

/**
 * reference integrity: every unqualified reference must resolve inside this
 * document. The classic failure this catches: a definition's content() file
 * was imported for its refs but never mounted via use()
 */
export function resolveDocumentRefs(doc: Record<string, unknown>, refs: DocRef[]): OpIssue[] {
	const REF_LABEL: Record<RefSection, string> = {
		cards: 'card',
		modifiers: 'modifier',
		enemies: 'enemy',
		watchers: 'watcher',
		encounters: 'encounter',
		affinities: 'affinity',
	}
	const defined = new Map<RefSection, Set<string>>()
	for (const section of Object.keys(REF_LABEL) as RefSection[]) {
		const ids = new Set<string>()
		for (const [, entry] of entries(doc[section])) {
			if (typeof entry?.id === 'string') ids.add(entry.id)
		}
		defined.set(section, ids)
	}

	const issues: OpIssue[] = []
	for (const ref of refs) {
		const known = defined.get(ref.section) as Set<string>
		if (known.has(ref.id)) continue
		issues.push({
			path: ref.path,
			message:
				`reference to unknown ${REF_LABEL[ref.section]} "${ref.id}"${didYouMean(ref.id, known)}` +
				' — defined in a content() that was never mounted via use()?',
		})
	}
	return issues
}
