import { CondFormula, Gt, Gte, Lt, Lte } from '../builders/condition'
import type { Condition } from '../schema/condition'

import { ctx, State } from './value'

/** player hp percentage strictly below threshold (0–100) */
export function HpBelow(percent: number): Condition {
	return Lt(ctx.playerHpPercent, percent)
}

/** player hp percentage strictly above threshold */
export function HpAbove(percent: number): Condition {
	return Gt(ctx.playerHpPercent, percent)
}

/** player hp percentage at or below threshold */
export function HpAtMost(percent: number): Condition {
	return Lte(ctx.playerHpPercent, percent)
}

/** player hp percentage at or above threshold */
export function HpAtLeast(percent: number): Condition {
	return Gte(ctx.playerHpPercent, percent)
}

/** card state field is at least N */
export function StateAtLeast(key: string, n: number): Condition {
	return Gte(State(key), n)
}

/** card stack count is at least N */
export function StackAtLeast(n: number): Condition {
	return Gte(ctx.cardStack, n)
}

/** battle turn is at least N */
export function TurnReached(n: number): Condition {
	return Gte(ctx.battleTurn, n)
}

/** escape hatch for arbitrary boolean expressions */
export function HasModifier(cardRef: string, modifierId: string): Condition {
	return CondFormula(`has_modifier("${cardRef}", "${modifierId}")`)
}
