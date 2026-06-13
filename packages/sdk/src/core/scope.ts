// Collector core: an ambient stack of scopes that effect statements
// (dmg, block, when, ...) push themselves into while the author's callback
// runs. The product is a JSON tree of s-expressions — exactly what the
// engine's GCF loader consumes.
//
// Three mechanisms:
//   1. scope stack — collect() pushes a root scope, when() gathers branches
//      into child scopes; calling an effect outside any scope is a clear error
//   2. auto-let — impure values (rand) and .pin() register a binding at the
//      current position; on finalize the tail of effects is wrapped into
//      ["let", {name: value}, tail], mirroring withLets in the engine core
//   3. leak-tracking — a Cond created inside a scope and never consumed fails
//      the build: it is almost always `if (cond)` written instead of when(cond)

export class RiftedBuildError extends Error {
	override name = 'RiftedBuildError'
}

/** serializable nodes implement this symbol (Expr, Cond, LetRef) */
export const SER: unique symbol = Symbol('rifted.ser')

interface Serializable {
	[SER](): unknown
}

function isSerializable(x: unknown): x is Serializable {
	return typeof x === 'object' && x !== null && typeof (x as Serializable)[SER] === 'function'
}

/** a let-binding: the name is assigned at root finalize (unless .as() named it) */
export interface Binding {
	name: string | undefined
	explicit: boolean
	value: unknown
	used: boolean
}

type Item = { effect: unknown } | { binding: Binding }

/** a when/chance branch: child-scope body, folded at serialization time */
class Body {
	constructor(readonly items: Item[]) {}
	[SER](): unknown {
		return foldItems(this.items)
	}
}

export interface LeakTracked {
	consumed: boolean
	describe(): string
}

interface Scope {
	items: Item[]
	root: RootScope
}

interface RootScope extends Scope {
	label: string
	bindings: Binding[]
	conds: Set<LeakTracked>
	watcherId?: string
	card?: CardBuildInfo
}

/** identity of the card being built — lets deferCard hoist watcher defs */
export interface CardBuildInfo {
	cardId: string
	hoistWatcher(def: Record<string, unknown>, name: string | undefined, suffix: string): string
}

const stack: Scope[] = []

function rootOf(): RootScope | null {
	return stack.length > 0 ? stack[stack.length - 1].root : null
}

export function currentScope(): Scope | null {
	return stack.length > 0 ? stack[stack.length - 1] : null
}

export function requireScope(what: string): Scope {
	const sc = currentScope()
	if (!sc) {
		throw new RiftedBuildError(
			`${what} called outside a builder callback — effect statements only work inside onPlay/hook/do bodies`,
		)
	}
	return sc
}

export function currentCard(): CardBuildInfo | null {
	return rootOf()?.card ?? null
}

export function currentWatcherId(): string | undefined {
	return rootOf()?.watcherId
}

export function scopeLabel(): string {
	return rootOf()?.label ?? '<top level>'
}

/** register an effect node in the current scope */
export function pushEffect(node: unknown): void {
	requireScope('an effect statement').items.push({ effect: node })
}

/** register a let-binding at the current scope position */
export function bindLet(value: unknown, name?: string): Binding {
	const sc = requireScope(name ? `pin('${name}')` : 'a let-binding (rand/pin)')
	const binding: Binding = { name, explicit: name !== undefined, value, used: false }
	sc.items.push({ binding })
	sc.root.bindings.push(binding)
	return binding
}

export function trackCond(c: LeakTracked): void {
	rootOf()?.conds.add(c)
}

export function consumeCond(c: LeakTracked): void {
	c.consumed = true
}

export interface CollectOptions {
	watcherId?: string
	card?: CardBuildInfo
}

/**
 * run the author's callback in a fresh root scope and return the finished
 * JSON effect node (or null when the body is empty)
 */
export function collect(label: string, fn: () => void, opts: CollectOptions = {}): unknown {
	const root: RootScope = {
		items: [],
		bindings: [],
		conds: new Set(),
		label,
		watcherId: opts.watcherId,
		card: opts.card,
		// a root is its own root; assigned right below (self-reference)
		root: undefined as unknown as RootScope,
	}
	root.root = root
	stack.push(root)
	try {
		const ret = fn() as unknown
		if (
			ret !== null &&
			typeof ret === 'object' &&
			typeof (ret as Promise<unknown>).then === 'function'
		) {
			throw new RiftedBuildError(`${label}: builder callbacks must be synchronous (got a Promise)`)
		}
	} finally {
		stack.pop()
	}
	return finalize(root)
}

/** gather a branch (when/chance) into a child scope of the same root */
export function collectChild(fn: () => void): Body {
	const parent = requireScope('a branch')
	const child: Scope = { items: [], root: parent.root }
	stack.push(child)
	try {
		fn()
	} finally {
		stack.pop()
	}
	return new Body(child.items)
}

function finalize(root: RootScope): unknown {
	// names: explicit ones as-is, the rest get _v0, _v1 in registration order
	const taken = new Set<string>()
	for (const b of root.bindings) {
		if (!b.explicit) continue
		if (taken.has(b.name as string)) {
			throw new RiftedBuildError(`${root.label}: duplicate let-binding name '${b.name}'`)
		}
		taken.add(b.name as string)
	}
	let n = 0
	for (const b of root.bindings) {
		if (b.explicit) continue
		let name = `_v${n++}`
		while (taken.has(name)) name = `_v${n++}`
		b.name = name
	}

	const out = foldItems(root.items)

	for (const b of root.bindings) {
		if (!b.used) {
			throw new RiftedBuildError(
				`${root.label}: let-binding '${b.name}' is created but never read — drop it or use the value`,
			)
		}
	}
	for (const c of root.conds) {
		if (!c.consumed) {
			throw new RiftedBuildError(
				`${root.label}: condition ${c.describe()} is built but never used — did you mean when(...)?`,
			)
		}
	}
	return out
}

/**
 * fold the item stream into an effect node: a binding wraps its tail into
 * ["let", {name: value}, tail], preserving execution order
 */
function foldItems(items: Item[]): unknown {
	let tail: unknown[] = []
	for (let i = items.length - 1; i >= 0; i--) {
		const it = items[i]
		if ('effect' in it) {
			tail.unshift(ser(it.effect))
		} else {
			const b = it.binding
			if (tail.length === 0) {
				throw new RiftedBuildError(
					`${scopeOrBuild()}: let-binding '${b.name}' has no effects after it — nothing can read it`,
				)
			}
			tail = [['let', { [b.name as string]: ser(b.value) }, seqOf(tail)]]
		}
	}
	return seqOf(tail)
}

function scopeOrBuild(): string {
	return rootOf()?.label ?? 'build'
}

function seqOf(effects: unknown[]): unknown {
	if (effects.length === 0) return null
	if (effects.length === 1) return effects[0]
	return effects
}

/** recursively serialize a live node into a JSON-ready structure */
export function ser(x: unknown): unknown {
	if (typeof x === 'number' || typeof x === 'string' || typeof x === 'boolean') return x
	if (x === null || x === undefined) return null
	if (isSerializable(x)) return x[SER]()
	if (Array.isArray(x)) return x.map(ser)
	if (typeof x === 'object') {
		const out: Record<string, unknown> = {}
		for (const [k, v] of Object.entries(x)) {
			if (v === undefined) continue
			out[k] = ser(v)
		}
		return out
	}
	throw new RiftedBuildError(`${scopeOrBuild()}: cannot serialize ${typeof x} into GCF`)
}
