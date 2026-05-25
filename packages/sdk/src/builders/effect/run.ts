import type { Effect } from '../../schema/effect'
import type { Target } from '../../schema/enums'
import type { Value } from '../../schema/value'

/** grant coins to a player. target defaults to self */
export function AddCoins(opts: { target?: Target; amount: Value }): Effect {
	const out: any = { do: 'add_coins', amount: opts.amount }
	if (opts.target !== undefined) out.target = opts.target
	return out
}

/** deduct coins from a player */
export function SpendCoins(opts: { target?: Target; amount: Value }): Effect {
	const out: any = { do: 'spend_coins', amount: opts.amount }
	if (opts.target !== undefined) out.target = opts.target
	return out
}

/** restore HP, capped at max_hp. target defaults to self */
export function HealEffect(opts: { target?: Target; amount: Value }): Effect {
	const out: any = { do: 'heal', amount: opts.amount }
	if (opts.target !== undefined) out.target = opts.target
	return out
}

/** set a run-wide state field. key must be namespaced (mod:key) */
export function SetRunState(opts: { key: string; value: Value }): Effect {
	return { do: 'set_run_state', key: opts.key, value: opts.value }
}

/** atomically add to a run-wide state field */
export function AddRunState(opts: { key: string; value: Value }): Effect {
	return { do: 'add_run_state', key: opts.key, value: opts.value }
}

/** remove a key from run state */
export function ClearRunState(opts: { key: string }): Effect {
	return { do: 'clear_run_state', key: opts.key }
}

/** set an encounter-local state field */
export function SetEncounterState(opts: { key: string; value: Value }): Effect {
	return { do: 'set_encounter_state', key: opts.key, value: opts.value }
}

/** atomically add to an encounter-local state field */
export function AddEncounterState(opts: { key: string; value: Value }): Effect {
	return { do: 'add_encounter_state', key: opts.key, value: opts.value }
}
