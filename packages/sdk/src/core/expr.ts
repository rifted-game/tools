// Expr/Cond — values and conditions of the content language. Each instance
// holds a live s-expression (nodes may reference other Exprs and let-bindings);
// serialization to JSON happens at scope finalize / document build.
//
// Caps are phantom typing of context requirements. Expr<'battle'> is only
// alive inside a battle, Expr<'mod'> only inside a modifier hook. Builder
// slots declare which caps they accept (a card's render slot rejects
// mod.stack) — the engine silently resolves such paths to 0, we catch them
// at compile time instead.

import { type Binding, bindLet, consumeCond, RiftedBuildError, SER, ser, trackCond } from './scope'

/** an expression's requirement on the execution context */
export type Cap = 'battle' | 'card' | 'mod' | 'event'

/** anything accepted in a value slot: expression, literal or path string */
export type ExprLike<N extends Cap = Cap> = Expr<N> | number | string

/** anything accepted in a condition slot */
export type CondLike<N extends Cap = Cap> = Cond<N> | boolean

export function assertValue(x: unknown, where: string): void {
	const ok =
		typeof x === 'number' ||
		typeof x === 'string' ||
		(typeof x === 'object' && x !== null && SER in x)
	if (!ok) {
		throw new RiftedBuildError(
			`${where}: expected a value (Expr, number or path string), got ${typeof x}`,
		)
	}
}

export class Expr<out N extends Cap = never> {
	declare readonly __caps?: N
	readonly node: unknown

	constructor(node: unknown) {
		this.node = node
	}

	[SER](): unknown {
		return ser(this.node)
	}

	// --- arithmetic ---

	add<M extends Cap = never>(x: ExprLike<M>): Expr<N | M> {
		return this.bin('add', x)
	}
	sub<M extends Cap = never>(x: ExprLike<M>): Expr<N | M> {
		return this.bin('sub', x)
	}
	mul<M extends Cap = never>(x: ExprLike<M>): Expr<N | M> {
		return this.bin('mul', x)
	}
	div<M extends Cap = never>(x: ExprLike<M>): Expr<N | M> {
		return this.bin('div', x)
	}
	rem<M extends Cap = never>(x: ExprLike<M>): Expr<N | M> {
		return this.bin('mod', x)
	}
	min<M extends Cap = never>(x: ExprLike<M>): Expr<N | M> {
		return this.bin('min', x)
	}
	max<M extends Cap = never>(x: ExprLike<M>): Expr<N | M> {
		return this.bin('max', x)
	}
	clamp<A extends Cap = never, B extends Cap = never>(
		lo: ExprLike<A>,
		hi: ExprLike<B>,
	): Expr<N | A | B> {
		assertValue(lo, 'clamp(lo)')
		assertValue(hi, 'clamp(hi)')
		return new Expr(['clamp', this, lo, hi])
	}

	floor(): Expr<N> {
		return new Expr(['floor', this])
	}
	ceil(): Expr<N> {
		return new Expr(['ceil', this])
	}
	round(): Expr<N> {
		return new Expr(['round', this])
	}
	abs(): Expr<N> {
		return new Expr(['abs', this])
	}

	/** value through the scale curve of the context card (["scale", ...]) */
	scaled(): Expr<N | 'card'> {
		return new Expr(['scale', this])
	}

	// --- comparisons ---

	gt<M extends Cap = never>(x: ExprLike<M>): Cond<N | M> {
		return this.cmp('gt', x)
	}
	gte<M extends Cap = never>(x: ExprLike<M>): Cond<N | M> {
		return this.cmp('gte', x)
	}
	lt<M extends Cap = never>(x: ExprLike<M>): Cond<N | M> {
		return this.cmp('lt', x)
	}
	lte<M extends Cap = never>(x: ExprLike<M>): Cond<N | M> {
		return this.cmp('lte', x)
	}
	eq<M extends Cap = never>(x: ExprLike<M>): Cond<N | M> {
		return this.cmp('eq', x)
	}
	neq<M extends Cap = never>(x: ExprLike<M>): Cond<N | M> {
		return this.cmp('neq', x)
	}

	// --- let snapshot ---

	/**
	 * pin the value at evaluation time: registers a let-binding and returns a
	 * reference to it. Needed when the world changes between reads
	 * ("deal damage equal to half my hp AND lose that much hp")
	 */
	pin(name?: string): LetRefExpr<N> {
		return makeLetRef<N>(bindLet(this.node, name))
	}

	private bin(op: string, x: ExprLike): Expr<never> {
		assertValue(x, `.${op}()`)
		return new Expr([op, this, x])
	}

	private cmp(op: string, x: ExprLike): Cond<never> {
		assertValue(x, `.${op}()`)
		return new Cond([op, this, x])
	}
}

/** reference to a let-binding: serializes to "let.<name>" */
class LetRefExpr<N extends Cap> extends Expr<N> {
	constructor(private readonly binding: Binding) {
		super(null)
	}

	override [SER](): unknown {
		this.binding.used = true
		return `let.${this.binding.name}`
	}

	/** give the binding a human-readable name in gcf.json (debug cosmetics) */
	as(name: string): Expr<N> {
		if (!/^[a-z_][a-z0-9_]*$/i.test(name)) {
			throw new RiftedBuildError(`.as('${name}'): binding name must be an identifier`)
		}
		this.binding.name = name
		this.binding.explicit = true
		return this
	}
}

function makeLetRef<N extends Cap>(binding: Binding): LetRefExpr<N> {
	return new LetRefExpr<N>(binding)
}

export class Cond<out N extends Cap = never> {
	declare readonly __caps?: N
	readonly node: unknown
	consumed = false

	constructor(node: unknown) {
		this.node = node
		trackCond(this)
	}

	describe(): string {
		try {
			return JSON.stringify(ser(this.node))
		} catch {
			return '<condition>'
		}
	}

	[SER](): unknown {
		this.consumed = true
		return ser(this.node)
	}

	and<M extends Cap = never>(other: CondLike<M>): Cond<N | M> {
		return this.junction('and', other)
	}

	or<M extends Cap = never>(other: CondLike<M>): Cond<N | M> {
		return this.junction('or', other)
	}

	not(): Cond<N> {
		consumeCond(this)
		return new Cond(['not', this])
	}

	private junction(op: string, other: CondLike): Cond<never> {
		if (!(other instanceof Cond) && typeof other !== 'boolean') {
			throw new RiftedBuildError(`.${op}(): expected a Cond`)
		}
		consumeCond(this)
		if (other instanceof Cond) consumeCond(other)
		return new Cond([op, this, other])
	}
}

/** numeric literal as an Expr — entry point of a fluent chain: lit(100).sub(x) */
export function lit(n: number): Expr {
	return new Expr(n)
}

/** raw engine path ("self.hp_percent") — escape hatch, unchecked */
export function get(path: string): Expr<Cap> {
	return new Expr(path)
}

/**
 * dice roll: rand_int [lo..hi]. Each call = one let-binding = one roll;
 * the returned reference reuses the result without rolling again. Only
 * valid inside effect callbacks
 */
export function rand(lo: ExprLike, hi: ExprLike): LetRefExpr<never> {
	assertValue(lo, 'rand(lo)')
	assertValue(hi, 'rand(hi)')
	return makeLetRef(bindLet(['rand_int', lo, hi]))
}

export type { LetRefExpr }
