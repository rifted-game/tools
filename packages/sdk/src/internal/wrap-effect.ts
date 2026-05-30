import { Sequence } from '../builders/effect/composite'
import type { Effect } from '../schema/effect'

/**
 * normalize Effect | Effect[] to a single Effect.
 * arrays of 2+ effects wrap in Sequence; a single-element array unwraps to that
 * element so the generated json carries no redundant `sequence` wrapper.
 */
export function wrapEffect(e: Effect | Effect[]): Effect {
	if (!Array.isArray(e)) return e
	if (e.length === 1) return e[0]
	return Sequence(e)
}
