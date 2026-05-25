import type { Effect } from '../../schema/effect'
import type { Target } from '../../schema/enums'
import type { Value } from '../../schema/value'

/** reduce the cooldown of a card by amount turns */
export function ReduceCooldown(opts: { target: Target; amount: Value }): Effect {
	return {
		do: 'reduce_ally_cooldown',
		target: opts.target,
		amount: opts.amount,
	}
}

/** reset a card's cooldown to zero, making it immediately playable */
export function ResetCooldown(opts: { target: Target }): Effect {
	return { do: 'reset_ally_card_cooldown', target: opts.target }
}

/** permanently remove a specific card from a player's deck */
export function RemoveCard(opts: { target: Target }): Effect {
	return { do: 'remove_card_from_deck', target: opts.target }
}

/** remove N random cards from the target's deck */
export function RemoveRandomCards(opts: { target?: Target; count: Value }): Effect {
	const out: any = { do: 'remove_random_cards', count: opts.count }
	if (opts.target !== undefined) out.target = opts.target
	return out
}

/** grant additional charges to a card */
export function GrantCharges(opts: { target: Target; amount: Value }): Effect {
	return {
		do: 'grant_ally_card_charges',
		target: opts.target,
		amount: opts.amount,
	}
}

/** atomically add to a card state field. negative values decrement */
export function AddCardState(opts: { target?: Target; key: string; value: Value }): Effect {
	const out: any = { do: 'add_card_state', key: opts.key, value: opts.value }
	if (opts.target !== undefined) out.target = opts.target
	return out
}

/** set a card state field to an exact value */
export function SetCardState(opts: { target?: Target; key: string; value: Value }): Effect {
	const out: any = { do: 'set_card_state', key: opts.key, value: opts.value }
	if (opts.target !== undefined) out.target = opts.target
	return out
}

/** insert a card into a player's deck mid-combat. temporary cards vanish at end of combat */
export function AddCardToDeck(opts: { target: Target; card: string; temporary?: boolean }): Effect {
	return {
		do: 'add_card_to_player_deck',
		target: opts.target,
		card: opts.card,
		temporary: opts.temporary ?? false,
	}
}

/** remove a random card from target's hand */
export function StealCard(opts: { target: Target }): Effect {
	return { do: 'steal_card', target: opts.target }
}
