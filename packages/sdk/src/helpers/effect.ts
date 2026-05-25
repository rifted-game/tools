import { Damage, GainBlock, SelfDamage } from '../builders/effect/battle'
import { HealEffect } from '../builders/effect/run'
import type { Effect } from '../schema/effect'
import type { Target } from '../schema/enums'
import type { Value } from '../schema/value'

/** deal damage. defaults to selected_enemy */
export function Dmg(amount: Value, target: Target = 'selected_enemy'): Effect {
	return Damage({ target, amount })
}

/** deal damage to every enemy */
export function DmgAll(amount: Value): Effect {
	return Damage({ target: 'all_enemies', amount })
}

/** deal damage to a random enemy */
export function DmgRandom(amount: Value): Effect {
	return Damage({ target: 'random_enemy', amount })
}

/** gain block. defaults to self */
export function Block(amount: Value, target?: Target): Effect {
	return target === undefined ? GainBlock({ amount }) : GainBlock({ target, amount })
}

/** gain block on every ally */
export function BlockAll(amount: Value): Effect {
	return GainBlock({ target: 'all_allies', amount })
}

/** restore hp to self */
export function Heal(amount: Value): Effect {
	return HealEffect({ amount })
}

/** deal damage to self, bypassing block */
export function SelfDmg(amount: Value): Effect {
	return SelfDamage(amount)
}
