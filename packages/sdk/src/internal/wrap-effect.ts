import { Sequence } from '../builders/effect/composite'
import type { Effect } from '../schema/effect'

/** normalize Effect | Effect[] to a single Effect, wrapping arrays in Sequence */
export function wrapEffect(e: Effect | Effect[]): Effect {
	return Array.isArray(e) ? Sequence(e) : e
}
