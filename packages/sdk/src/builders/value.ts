import type { Condition } from '../schema/condition'
import type { Value } from '../schema/value'

/** read a value from the runtime evaluation context by dotted path */
export function Get(path: string): Value {
	return { get: path }
}

/** evaluate an expr-lang expression. use sparingly — typed combinators are preferred */
export function Formula(src: string): Value {
	return { formula: src }
}

/** wrap a value in the active card's scale curve (linear, exp, hyp, flat) */
export function Scale(inner: Value): Value {
	return { scale: inner }
}

/** sum of two or more values */
export function Add(...values: Value[]): Value {
	if (values.length < 2) throw new Error('Add requires at least 2 operands')
	return { add: values }
}

/** difference: a - b */
export function Sub(a: Value, b: Value): Value {
	return { sub: [a, b] }
}

/** product of two or more values */
export function Mul(...values: Value[]): Value {
	if (values.length < 2) throw new Error('Mul requires at least 2 operands')
	return { mul: values }
}

/** quotient: a / b */
export function Div(a: Value, b: Value): Value {
	return { div: [a, b] }
}

/** minimum of two or more values */
export function Min(...values: Value[]): Value {
	if (values.length < 2) throw new Error('Min requires at least 2 operands')
	return { min: values }
}

/** maximum of two or more values */
export function Max(...values: Value[]): Value {
	if (values.length < 2) throw new Error('Max requires at least 2 operands')
	return { max: values }
}

/** conditional value: returns then when condition is true, otherwise else */
export function ValueIf(opts: { if: Condition; then: Value; else: Value }): Value {
	return { if: opts.if, then: opts.then, else: opts.else }
}

/** bind named values once and reuse them inside the in expression */
export function ValueLet(opts: { let: Record<string, Value>; in: Value }): Value {
	return { let: opts.let, in: opts.in }
}
