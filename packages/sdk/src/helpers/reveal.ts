import type { RevealKind } from '../schema/enums'

/** a reveal condition for a hidden card. see `revealOn` on the card builder */
export interface RevealTrigger {
	kind: RevealKind
	threshold?: number
}

/** reveal once the battle reaches turn N */
export function onTurn(threshold: number): RevealTrigger {
	return { kind: 'turn_n', threshold }
}

/** reveal once cumulative HP damage taken reaches `threshold` */
export function onDamageTaken(threshold: number): RevealTrigger {
	return { kind: 'damage_taken', threshold }
}

/** reveal once the player has killed `threshold` enemies (defaults to 1) */
export function onEnemyDeath(threshold?: number): RevealTrigger {
	const out: RevealTrigger = { kind: 'enemy_died' }
	if (threshold !== undefined) out.threshold = threshold
	return out
}

/** reveal once the player's block is fully pierced */
export function onBlockBroken(): RevealTrigger {
	return { kind: 'block_broken' }
}

/** reveal once any ally receives a buff */
export function onAllyBuffed(): RevealTrigger {
	return { kind: 'ally_buffed' }
}
