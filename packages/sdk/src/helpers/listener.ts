import { Listener as ListenerBuilder } from '../builders/listener'
import type { Condition } from '../schema/condition'
import type { Effect } from '../schema/effect'
import type { Listener } from '../schema/listener'

/** subscribe to any engine or custom event */
export function On(event: string, effect: Effect, when?: Condition): Listener {
	return ListenerBuilder({ onEvent: event, effect, when })
}

/** triggered when this card is played */
export function OnPlay(effect: Effect, when?: Condition): Listener {
	return On('card_played', effect, when)
}

/** triggered when this card is drawn */
export function OnDraw(effect: Effect, when?: Condition): Listener {
	return On('card_drawn', effect, when)
}

/** triggered when the owning player takes damage */
export function OnHit(effect: Effect, when?: Condition): Listener {
	return On('damage_taken', effect, when)
}

/** triggered when the owning player deals damage */
export function OnDeal(effect: Effect, when?: Condition): Listener {
	return On('damage_dealt', effect, when)
}

/** triggered at the start of the owner's turn */
export function OnTurnStart(effect: Effect, when?: Condition): Listener {
	return On('turn_start', effect, when)
}

/** triggered at the end of the owner's turn */
export function OnTurnEnd(effect: Effect, when?: Condition): Listener {
	return On('turn_end', effect, when)
}

/** triggered when an enemy dies */
export function OnKill(effect: Effect, when?: Condition): Listener {
	return On('enemy_died', effect, when)
}

/** triggered when an ally is summoned */
export function OnAllySummoned(effect: Effect, when?: Condition): Listener {
	return On('ally_summoned', effect, when)
}
