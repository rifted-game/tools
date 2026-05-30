import { Lt } from '../builders/condition'
import {
	ConditionalIntent,
	Intent,
	IntentPatternConditional,
	IntentPatternSequence,
} from '../builders/intent'
import { Get } from '../builders/value'
import type { IntentPattern, Intent as IntentSchema } from '../schema/intent'
import type { Text } from '../schema/primitives'
import type { Value } from '../schema/value'
import { Block, Dmg } from './effect'

// NOTE: the engine treats an intent's `amount` as a display-only telegraph —
// damage/block is applied solely by `on_execute`. So every offensive/defensive
// intent must wire its effect through `onExecute`, or it does nothing on its turn.

/** every turn attacks for fixed damage */
function aggressor(damage: Value): IntentPattern {
	return IntentPatternSequence([
		Intent({ kind: 'attack', description: 'Attacks', amount: damage, onExecute: Dmg(damage) }),
	])
}

/** alternates attack and defend each turn */
function alternating(damage: Value, blockAmount: Value): IntentPattern {
	return IntentPatternSequence([
		Intent({ kind: 'attack', description: 'Attacks', amount: damage, onExecute: Dmg(damage) }),
		Intent({
			kind: 'defend',
			description: 'Defends',
			amount: blockAmount,
			onExecute: Block(blockAmount),
		}),
	])
}

/** charges for N turns then unleashes a heavy hit */
function charger(chargeTurns: number, chargedDamage: Value): IntentPattern {
	const charging = Array.from({ length: chargeTurns }, () =>
		Intent({ kind: 'charging', description: 'Charging...' }),
	)
	return IntentPatternSequence([
		...charging,
		Intent({
			kind: 'attack',
			description: 'Heavy attack',
			amount: chargedDamage,
			onExecute: Dmg(chargedDamage),
		}),
	])
}

/** execute attack below hp threshold, otherwise normal attack */
function opportunist(normalDmg: Value, executeDmg: Value, hpThreshold = 30): IntentPattern {
	return IntentPatternConditional([
		ConditionalIntent({
			condition: Lt(Get('target.hp_percent'), hpThreshold),
			kind: 'attack',
			description: 'Execute',
			amount: executeDmg,
			onExecute: Dmg(executeDmg),
		}),
		ConditionalIntent({
			condition: { formula: 'true' },
			kind: 'attack',
			description: 'Attacks',
			amount: normalDmg,
			onExecute: Dmg(normalDmg),
		}),
	])
}

export const intents = { aggressor, alternating, charger, opportunist }

// --- single-intent constructors -------------------------------------------
// `amount` is the telegraph shown to the player; the engine applies nothing
// from it on its own, so the effect is wired through `on_execute`. Writing the
// number once keeps the telegraph and the effect from drifting apart.

/** an attack intent: telegraphs `amount` and deals it to the picked target */
function attack(amount: Value, description: Text = 'Attacks'): IntentSchema {
	return Intent({ kind: 'attack', description, amount, onExecute: Dmg(amount) })
}

/** a defend intent: telegraphs `amount` and grants that much block to self */
function defend(amount: Value, description: Text = 'Defends'): IntentSchema {
	return Intent({ kind: 'defend', description, amount, onExecute: Block(amount) })
}

/** a charging intent: pure telegraph, no effect this turn */
function charge(description: Text = 'Charging...'): IntentSchema {
	return Intent({ kind: 'charging', description })
}

export const intent = { attack, defend, charge }
