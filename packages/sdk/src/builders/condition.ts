import type { Condition } from '../schema/condition'
import type { Value } from '../schema/value'

/** strict less than */
export function Lt(a: Value, b: Value): Condition {
	return { lt: [a, b] }
}

/** strict greater than */
export function Gt(a: Value, b: Value): Condition {
	return { gt: [a, b] }
}

/** less than or equal */
export function Lte(a: Value, b: Value): Condition {
	return { lte: [a, b] }
}

/** greater than or equal */
export function Gte(a: Value, b: Value): Condition {
	return { gte: [a, b] }
}

/** equality */
export function Eq(a: Value, b: Value): Condition {
	return { eq: [a, b] }
}

/** inequality */
export function Neq(a: Value, b: Value): Condition {
	return { neq: [a, b] }
}

/** logical and of two or more conditions */
export function And(...conditions: Condition[]): Condition {
	if (conditions.length < 2) throw new Error('And requires at least 2 conditions')
	return { and: conditions }
}

/** logical or of two or more conditions */
export function Or(...conditions: Condition[]): Condition {
	if (conditions.length < 2) throw new Error('Or requires at least 2 conditions')
	return { or: conditions }
}

/** logical negation */
export function Not(condition: Condition): Condition {
	return { not: condition }
}

/** escape hatch for arbitrary boolean expressions */
export function CondFormula(src: string): Condition {
	return { formula: src }
}
