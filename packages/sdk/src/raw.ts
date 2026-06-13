// Escape hatch: raw s-expressions 1:1 with GCF. For when the sugar falls
// short or you need a cross-namespace path the typed contexts don't cover

import { type Cap, Cond, Expr } from './core/expr'
import { pushEffect, requireScope } from './core/scope'

export { get, lit } from './core/expr'

/** raw value expression: value(['rand_int', 1, 6]) */
export function value(node: unknown): Expr<Cap> {
	return new Expr(node)
}

/** raw condition: cond(['has_tag', 'attack']) */
export function cond(node: unknown): Cond<Cap> {
	return new Cond(node)
}

/** raw effect statement: effect(['noop']) — pushed into the current scope */
export function effect(node: unknown[]): void {
	requireScope('raw effect()')
	pushEffect(node)
}

/** "the context card has this tag" condition */
export function hasTag(tag: string): Cond<'card'> {
	return new Cond(['has_tag', tag])
}

/** "the acting player is attached to this affinity" (full "ns:name" for foreign ones) */
export function attachedTo(affinity: string): Cond<Cap> {
	return new Cond(['attached_to', affinity])
}

/** custom event by raw kind ("ns:name") with the payload as-is */
export function emitEvent(kind: string, payload?: Record<string, unknown>): void {
	requireScope('emitEvent()')
	if (payload && Object.keys(payload).length > 0) pushEffect(['emit', kind, payload])
	else pushEffect(['emit', kind])
}
