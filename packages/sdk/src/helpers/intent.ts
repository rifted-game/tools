import { Lt } from '../builders/condition'
import {
	ConditionalIntent,
	Intent,
	IntentPatternConditional,
	IntentPatternSequence,
} from '../builders/intent'
import { Get } from '../builders/value'
import type { IntentPattern } from '../schema/intent'
import type { Value } from '../schema/value'

/** every turn attacks for fixed damage */
function aggressor(damage: Value): IntentPattern {
	return IntentPatternSequence([Intent({ kind: 'attack', description: 'Attacks', amount: damage })])
}

/** alternates attack and defend each turn */
function alternating(damage: Value, blockAmount: Value): IntentPattern {
	return IntentPatternSequence([
		Intent({ kind: 'attack', description: 'Attacks', amount: damage }),
		Intent({ kind: 'defend', description: 'Defends', amount: blockAmount }),
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
		}),
		ConditionalIntent({
			condition: { formula: 'true' },
			kind: 'attack',
			description: 'Attacks',
			amount: normalDmg,
		}),
	])
}

export const intents = { aggressor, alternating, charger, opportunist }
