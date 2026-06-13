// The f template: arithmetic reads as a formula instead of an inside-out chain.
//
//   addBaseDamage(f`floor((100 - ${self.hpPercent}) * 0.1) * ${mod.stack}`)
//
// Grammar: numbers, + - * / %, parentheses, unary minus, functions
// floor/ceil/round/abs/min/max/clamp, ${Expr|number} holes. Parsed at build
// time; errors carry the position in the string. Comparisons and logic stay
// with the fluent methods (.gt/.and) — they return Cond, the template
// computes numbers

import { type Cap, Expr, type ExprLike } from './core/expr'
import { RiftedBuildError } from './core/scope'

type Token =
	| { t: 'num'; v: number }
	| { t: 'hole'; v: ExprLike<Cap> }
	| { t: 'ident'; v: string }
	| { t: 'op'; v: string }

const FUNCS: Record<string, { args: [number, number] }> = {
	floor: { args: [1, 1] },
	ceil: { args: [1, 1] },
	round: { args: [1, 1] },
	abs: { args: [1, 1] },
	min: { args: [2, Number.POSITIVE_INFINITY] },
	max: { args: [2, Number.POSITIVE_INFINITY] },
	clamp: { args: [3, 3] },
}

function tokenize(parts: readonly string[], holes: ExprLike<Cap>[]): Token[] {
	const tokens: Token[] = []
	for (let p = 0; p < parts.length; p++) {
		const src = parts[p]
		let i = 0
		while (i < src.length) {
			const c = src[i]
			if (/\s/.test(c)) {
				i++
				continue
			}
			if (/[0-9.]/.test(c)) {
				const m = src.slice(i).match(/^\d*\.?\d+/)
				if (!m) throw new RiftedBuildError(`f\`...\`: bad number at "${src.slice(i, i + 8)}"`)
				tokens.push({ t: 'num', v: Number(m[0]) })
				i += m[0].length
				continue
			}
			if (/[a-z_]/i.test(c)) {
				const m = src.slice(i).match(/^[a-z_][a-z0-9_]*/i)
				if (!m) throw new RiftedBuildError(`f\`...\`: bad identifier at "${src.slice(i, i + 8)}"`)
				tokens.push({ t: 'ident', v: m[0] })
				i += m[0].length
				continue
			}
			if ('+-*/%(),'.includes(c)) {
				tokens.push({ t: 'op', v: c })
				i++
				continue
			}
			throw new RiftedBuildError(`f\`...\`: unexpected character "${c}" at offset ${i}`)
		}
		if (p < holes.length) tokens.push({ t: 'hole', v: holes[p] })
	}
	return tokens
}

class Parser {
	private pos = 0
	constructor(private readonly tokens: Token[]) {}

	parse(): unknown {
		const node = this.expr()
		if (this.pos < this.tokens.length) {
			throw new RiftedBuildError(`f\`...\`: unexpected trailing ${JSON.stringify(this.peek())}`)
		}
		return node
	}

	private peek(): Token | undefined {
		return this.tokens[this.pos]
	}

	private takeOp(v: string): boolean {
		const t = this.peek()
		if (t && t.t === 'op' && t.v === v) {
			this.pos++
			return true
		}
		return false
	}

	// expr := term (('+'|'-') term)*
	private expr(): unknown {
		let node = this.term()
		for (;;) {
			if (this.takeOp('+')) node = ['add', node, this.term()]
			else if (this.takeOp('-')) node = ['sub', node, this.term()]
			else return node
		}
	}

	// term := unary (('*'|'/'|'%') unary)*
	private term(): unknown {
		let node = this.unary()
		for (;;) {
			if (this.takeOp('*')) node = ['mul', node, this.unary()]
			else if (this.takeOp('/')) node = ['div', node, this.unary()]
			else if (this.takeOp('%')) node = ['mod', node, this.unary()]
			else return node
		}
	}

	private unary(): unknown {
		if (this.takeOp('-')) {
			const inner = this.unary()
			if (typeof inner === 'number') return -inner
			return ['sub', 0, inner]
		}
		return this.primary()
	}

	private primary(): unknown {
		const t = this.peek()
		if (!t) throw new RiftedBuildError('f`...`: unexpected end of formula')
		if (t.t === 'num') {
			this.pos++
			return t.v
		}
		if (t.t === 'hole') {
			this.pos++
			return t.v
		}
		if (t.t === 'ident') {
			this.pos++
			const fn = FUNCS[t.v]
			if (!fn) {
				throw new RiftedBuildError(
					`f\`...\`: unknown function "${t.v}" (known: ${Object.keys(FUNCS).join(', ')})`,
				)
			}
			if (!this.takeOp('(')) throw new RiftedBuildError(`f\`...\`: expected "(" after ${t.v}`)
			const args: unknown[] = []
			if (!this.takeOp(')')) {
				do {
					args.push(this.expr())
				} while (this.takeOp(','))
				if (!this.takeOp(')')) throw new RiftedBuildError(`f\`...\`: expected ")" closing ${t.v}`)
			}
			const [lo, hi] = fn.args
			if (args.length < lo || args.length > hi) {
				throw new RiftedBuildError(`f\`...\`: ${t.v}() takes ${lo === hi ? lo : `${lo}+`} args`)
			}
			return [t.v, ...args]
		}
		if (t.t === 'op' && t.v === '(') {
			this.pos++
			const node = this.expr()
			if (!this.takeOp(')')) throw new RiftedBuildError('f`...`: missing ")"')
			return node
		}
		throw new RiftedBuildError(`f\`...\`: unexpected "${t.v}"`)
	}
}

/** formula to expression: f\`floor(${x} * 0.5) + ${y}\` */
export function f(parts: TemplateStringsArray, ...holes: ExprLike<Cap>[]): Expr<Cap> {
	const node = new Parser(tokenize(parts.raw, holes)).parse()
	return new Expr(node)
}
