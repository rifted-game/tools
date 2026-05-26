import { Listener } from '../builders/listener'
import { wrapEffect } from '../internal/wrap-effect'
import type { Condition } from '../schema/condition'
import type { Effect } from '../schema/effect'
import type { Listener as ListenerType } from '../schema/listener'

type OnOpts = { when?: Condition }

function make(event: string, effect: Effect | Effect[], opts?: OnOpts): ListenerType {
	return Listener({ onEvent: event, effect: wrapEffect(effect), when: opts?.when })
}

/**
 * Namespace for subscribing to engine events.
 *
 * Use built-in methods for known events, `On.custom` for arbitrary or cross-mod events.
 * Every method accepts a single Effect or an array (auto-wrapped in Sequence).
 *
 * ```ts
 * passiveListeners: [
 *   On.turnStart(GainBlock(Scaled('base'))),
 *   On.damageTaken([AddStack(), EmitEvent({ event: 'on_hit' })], { when: HpBelow(50) }),
 *   On.custom('war_cry_triggered', Dmg(Param('bonus'))),
 * ]
 * ```
 */
export const On = {
	turnStart: (e: Effect | Effect[], opts?: OnOpts) => make('turn_start', e, opts),
	turnEnd: (e: Effect | Effect[], opts?: OnOpts) => make('turn_end', e, opts),
	cardPlayed: (e: Effect | Effect[], opts?: OnOpts) => make('card_played', e, opts),
	cardDrawn: (e: Effect | Effect[], opts?: OnOpts) => make('card_drawn', e, opts),
	cardReturnedFromCooldown: (e: Effect | Effect[], opts?: OnOpts) =>
		make('card_returned_from_cooldown', e, opts),
	damageIntentCreated: (e: Effect | Effect[], opts?: OnOpts) =>
		make('damage_intent_created', e, opts),
	damageDealt: (e: Effect | Effect[], opts?: OnOpts) => make('damage_dealt', e, opts),
	damageTaken: (e: Effect | Effect[], opts?: OnOpts) => make('damage_taken', e, opts),
	blockGained: (e: Effect | Effect[], opts?: OnOpts) => make('block_gained', e, opts),
	enemyDied: (e: Effect | Effect[], opts?: OnOpts) => make('enemy_died', e, opts),
	entityDied: (e: Effect | Effect[], opts?: OnOpts) => make('entity_died', e, opts),
	playerHpThreshold: (e: Effect | Effect[], opts?: OnOpts) => make('player_hp_threshold', e, opts),
	cardAcquiredCurseBound: (e: Effect | Effect[], opts?: OnOpts) =>
		make('card_acquired_curse_bound', e, opts),
	allySummoned: (e: Effect | Effect[], opts?: OnOpts) => make('ally_summoned', e, opts),
	cardModifierApplied: (e: Effect | Effect[], opts?: OnOpts) =>
		make('card_modifier_applied', e, opts),
	cardModifierRemoved: (e: Effect | Effect[], opts?: OnOpts) =>
		make('card_modifier_removed', e, opts),
	encounterOpened: (e: Effect | Effect[], opts?: OnOpts) => make('encounter_opened', e, opts),
	encounterClosed: (e: Effect | Effect[], opts?: OnOpts) => make('encounter_closed', e, opts),
	choiceMade: (e: Effect | Effect[], opts?: OnOpts) => make('choice_made', e, opts),
	playerHpChanged: (e: Effect | Effect[], opts?: OnOpts) => make('player_hp_changed', e, opts),
	coinsChanged: (e: Effect | Effect[], opts?: OnOpts) => make('coins_changed', e, opts),
	runStateChanged: (e: Effect | Effect[], opts?: OnOpts) => make('run_state_changed', e, opts),
	/** any event name — for custom or cross-mod events */
	custom: (event: string, e: Effect | Effect[], opts?: OnOpts) => make(event, e, opts),
}
