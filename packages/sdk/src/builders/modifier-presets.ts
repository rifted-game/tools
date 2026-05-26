// common asModifier configurations — covers ~90% of modifier use cases.
// for unusual trigger/event combinations build AsModifierOpts directly.

import { Get } from '../builders/value'
import { type Expr, wrapExpr } from '../helpers/expr'
import { wrapEffect } from '../internal/wrap-effect'
import type { Condition } from '../schema/condition'
import type { Effect } from '../schema/effect'
import type { Target } from '../schema/enums'
import type { Value } from '../schema/value'
import { Listener } from './listener'
import type { AsModifierOpts } from './modifier'

function dynProxy(prefix: string): Record<string, Expr> {
	return new Proxy({} as Record<string, Expr>, {
		get(_, key) {
			if (typeof key !== 'string') return undefined
			return wrapExpr(Get(`${prefix}.${key}`))
		},
	})
}

/** context available inside modifier effect callbacks */
export interface ModifierCallbackCtx {
	/** the donor card (this modifier) */
	modifier: {
		stack: Expr
		cooldown: Expr
		params: Record<string, Expr>
		state: Record<string, Expr>
	}
	/** Target literal for the host card */
	host: Extract<Target, 'host_card'>
	/** Target literal for the host card's owner */
	hostOwner: Extract<Target, 'host_owner'>
}

const modifierCtx: ModifierCallbackCtx = {
	modifier: {
		stack: wrapExpr(Get('modifier.stack')),
		cooldown: wrapExpr(Get('modifier.cooldown')),
		params: dynProxy('modifier.params'),
		state: dynProxy('modifier.state'),
	},
	host: 'host_card',
	hostOwner: 'host_owner',
}

interface ModifierPresetOpts {
	effect: ((ctx: ModifierCallbackCtx) => Effect | Effect[]) | Effect | Effect[]
	when?: Condition
	/** per-stack values merged into the host card's render context */
	contributes?: Record<string, Value>
}

function preset(
	trigger: AsModifierOpts['trigger'],
	onEvent: string,
	opts: ModifierPresetOpts,
): AsModifierOpts {
	const effect =
		typeof opts.effect === 'function'
			? wrapEffect(opts.effect(modifierCtx))
			: wrapEffect(opts.effect)
	return {
		trigger,
		listener: Listener({ onEvent, effect, when: opts.when }),
		...(opts.contributes && { renderContribution: opts.contributes }),
	}
}

/**
 * Modifier that activates when the host card is played.
 * The most common modifier pattern.
 *
 * ```ts
 * asModifier: OnHostPlayed({
 *   effect: ({ modifier, host }) =>
 *     GrantCharges({ target: host, amount: modifier.stack }),
 *   contributes: { charges_add: $.modifier.stack },
 * })
 * ```
 */
export function OnHostPlayed(opts: ModifierPresetOpts): AsModifierOpts {
	return preset('host_played', 'card_played', opts)
}

/** modifier that activates when the host card creates a damage intent */
export function OnHostDamageIntent(opts: ModifierPresetOpts): AsModifierOpts {
	return preset('host_damage_intent', 'damage_intent_created', opts)
}

/** modifier that activates when the host card is drawn */
export function OnHostDrawn(opts: ModifierPresetOpts): AsModifierOpts {
	return preset('host_drawn', 'card_drawn', opts)
}

/** modifier that activates when the host card comes off cooldown */
export function OnHostReturnedFromCooldown(opts: ModifierPresetOpts): AsModifierOpts {
	return preset('host_returned_from_cooldown', 'card_returned_from_cooldown', opts)
}

/** modifier that activates at the start of the owner's turn */
export function OnModifierTurnStart(opts: ModifierPresetOpts): AsModifierOpts {
	return preset('turn_start', 'turn_start', opts)
}

/** modifier that activates at the end of the owner's turn */
export function OnModifierTurnEnd(opts: ModifierPresetOpts): AsModifierOpts {
	return preset('turn_end', 'turn_end', opts)
}
