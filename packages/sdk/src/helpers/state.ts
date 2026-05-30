import type { StateInit } from '../schema/state'

/** a bare number is shorthand for a constant initial value */
export type StateInitInput = number | StateInit

/**
 * A random integer initial value, rolled once when the entity is created.
 * Both bounds are inclusive. Use in `initialState`:
 *
 * ```ts
 * initialState: { charge: 0, mood: randInt(1, 3) }
 * ```
 *
 * Named `randInt` (not `rand`) on purpose: it returns an integer in a closed
 * range, and the name says so — `rand` would imply a float and hide the bounds.
 */
export function randInt(min: number, max: number): StateInit {
	if (!Number.isInteger(min) || !Number.isInteger(max)) {
		throw new Error('randInt bounds must be integers')
	}
	if (min > max) throw new Error('randInt min must be <= max')
	return { random_int: { min, max } }
}

/** normalize a state-init input to its schema object form (bare number → const) */
export function normalizeStateInit(v: StateInitInput): StateInit {
	return typeof v === 'number' ? { const: v } : v
}

/** normalize a map of state-init inputs, or undefined */
export function normalizeInitialState(
	s: Record<string, StateInitInput> | undefined,
): Record<string, StateInit> | undefined {
	if (s === undefined) return undefined
	const out: Record<string, StateInit> = {}
	for (const [k, v] of Object.entries(s)) out[k] = normalizeStateInit(v)
	return out
}
