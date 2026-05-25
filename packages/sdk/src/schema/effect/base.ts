import { z } from 'zod'

// IMPORTANT: this file must never import from sibling effect modules.
// defines the Effect type alias and the EffectLazy forward reference used
// by composite/repeat/if branches. the actual schema lives in index.ts.
//
// EffectLazy is a mutable lazy wrapper — index.ts calls _registerEffect()
// immediately after assembling the full union, which populates _effect.
// z.lazy defers evaluation to parse time, so by then _effect is always set

export type Effect =
	// battle
	| { do: 'damage'; target: string; amount: unknown }
	| { do: 'gain_block'; target?: string; amount: unknown }
	| { do: 'self_damage'; amount: unknown }
	| {
			do: 'apply_buff'
			target: string
			buff: string
			stacks: unknown
			duration: unknown
	  }
	| {
			do: 'apply_debuff'
			target: string
			debuff: string
			stacks: unknown
			duration: unknown
	  }
	| { do: 'add_damage_modifier'; modifier: { kind: string; value: unknown } }
	// cards
	| { do: 'reduce_ally_cooldown'; target: string; amount: unknown }
	| { do: 'reset_ally_card_cooldown'; target: string }
	| { do: 'remove_card_from_deck'; target: string }
	| { do: 'remove_random_cards'; target?: string; count: unknown }
	| { do: 'grant_ally_card_charges'; target: string; amount: unknown }
	| { do: 'add_card_state'; target?: string; key: string; value: unknown }
	| { do: 'set_card_state'; target?: string; key: string; value: unknown }
	| {
			do: 'add_card_to_player_deck'
			target: string
			card: string
			temporary?: boolean
	  }
	| { do: 'steal_card'; target: string }
	// composite
	| { do: 'sequence'; effects: Effect[] }
	| { do: 'repeat'; count: unknown; effect: Effect }
	| { do: 'if'; condition: unknown; then: Effect; else?: Effect }
	| { do: 'let'; bindings: Record<string, unknown>; in: Effect }
	| { do: 'foreach'; targets: string; as: string; effect: Effect }
	| { do: 'random'; options: Effect[] }
	| { do: 'chance'; options: Array<{ weight: number; effect: Effect }> }
	| { do: 'emit_event'; event: string; payload?: Record<string, unknown> }
	| { do: 'trigger_after'; turns: number; effect: Effect }
	// summon
	| { do: 'summon_enemy'; id: string; count?: unknown }
	| { do: 'summon_ally'; id: string; duration?: unknown }
	// run
	| { do: 'add_coins'; target?: string; amount: unknown }
	| { do: 'spend_coins'; target?: string; amount: unknown }
	| { do: 'heal'; target?: string; amount: unknown }
	| { do: 'set_run_state'; key: string; value: unknown }
	| { do: 'add_run_state'; key: string; value: unknown }
	| { do: 'clear_run_state'; key: string }
	| { do: 'set_encounter_state'; key: string; value: unknown }
	| { do: 'add_encounter_state'; key: string; value: unknown }
	// screen
	| {
			do: 'offer_card_from_pool'
			rarity?: string
			affinity?: string
			count?: number
			pick_max?: number
			cost?: unknown
			skip_allowed?: boolean
	  }
	| { do: 'offer_relic'; id?: string; rarity?: string; cost?: unknown }
	| { do: 'open_encounter'; id: string }
	| {
			do: 'show_screen'
			screen: {
				kind: string
				title?: unknown
				body?: unknown
				config?: Record<string, unknown>
			}
	  }
	// presentation
	| { do: 'play_clip'; actor: string; clip: string; loop?: boolean }
	| { do: 'say'; actor: string; text: unknown; per_player?: boolean }
	| { do: 'wait'; duration: number }
	| { do: 'wait_for_input' }
	| { do: 'show_choices' }
	| { do: 'play_sfx'; asset: string }
	| {
			do: 'set_actor_position'
			actor: string
			position: unknown
			duration?: number
	  }
	| { do: 'close_encounter' }

let _effect: z.ZodType<Effect>

/** called by effect/index.ts immediately after the full union is assembled */
export function _registerEffect(schema: z.ZodType<Effect>): void {
	_effect = schema
}

export const EffectLazy: z.ZodType<Effect> = z.lazy(() => _effect)
