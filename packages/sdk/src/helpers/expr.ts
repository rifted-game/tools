import { And, Eq, Gt, Gte, Lt, Lte, Neq, Not, Or } from '../builders/condition'
import { Add, Div, Get, Max, Min, Mul, Scale, Sub } from '../builders/value'
import type { Condition } from '../schema/condition'
import type { Value } from '../schema/value'
import { ctx, EncState, Param, RunState, Scaled, State } from './value'

/** a Condition augmented with fluent boolean combinators */
export type CondExpr = Condition & {
	and(...others: Condition[]): CondExpr
	or(...others: Condition[]): CondExpr
	not(): CondExpr
}

export interface ExprMethods {
	/** a + b (variadic) */
	plus(...args: Value[]): Expr
	/** a - b */
	minus(b: Value): Expr
	/** a * b (variadic) */
	times(...args: Value[]): Expr
	/** a / b */
	over(b: Value): Expr
	/** min(a, b, ...) */
	min(...args: Value[]): Expr
	/** max(a, b, ...) */
	max(...args: Value[]): Expr
	/** apply the card's scale curve */
	scaled(): Expr
	/** clamp to [lo, hi] */
	clamp(lo: Value, hi: Value): Expr
	/** strict less than */
	lt(b: Value | number): CondExpr
	/** less than or equal */
	lte(b: Value | number): CondExpr
	/** strict greater than */
	gt(b: Value | number): CondExpr
	/** greater than or equal */
	gte(b: Value | number): CondExpr
	/** equality */
	eq(b: Value | number): CondExpr
	/** inequality */
	neq(b: Value | number): CondExpr
}

/**
 * A Value node augmented with fluent arithmetic and comparison methods.
 * Assignable to Value everywhere — methods are stripped by JSON.stringify.
 */
export type Expr = Value & ExprMethods

export function wrapCond(cond: Condition): CondExpr {
	const m = {
		and: (...others: Condition[]) => wrapCond(And(cond, ...others)),
		or: (...others: Condition[]) => wrapCond(Or(cond, ...others)),
		not: () => wrapCond(Not(cond)),
	}
	return Object.assign({} as Condition, cond, m) as unknown as CondExpr
}

export function wrapExpr(val: Value): Expr {
	const m: ExprMethods = {
		plus: (...args) => wrapExpr(Add(val, ...args)),
		minus: b => wrapExpr(Sub(val, b)),
		times: (...args) => wrapExpr(Mul(val, ...args)),
		over: b => wrapExpr(Div(val, b)),
		min: (...args) => wrapExpr(Min(val, ...args)),
		max: (...args) => wrapExpr(Max(val, ...args)),
		scaled: () => wrapExpr(Scale(val)),
		clamp: (lo, hi) => wrapExpr(Max(Min(val, hi), lo)),
		lt: b => wrapCond(Lt(val, b)),
		lte: b => wrapCond(Lte(val, b)),
		gt: b => wrapCond(Gt(val, b)),
		gte: b => wrapCond(Gte(val, b)),
		eq: b => wrapCond(Eq(val, b)),
		neq: b => wrapCond(Neq(val, b)),
	}
	return Object.assign({} as Value, val, m) as unknown as Expr
}

/**
 * Fluent value builder — raw access for advanced or programmatic use cases.
 * Most code should use `$` instead.
 *
 * ```ts
 * v.param('base').plus(v.param('bonus')).times(v.ctx.cardStack)
 * ```
 */
export const v = {
	/** card.params.<key> */
	param: (key: string): Expr => wrapExpr(Param(key)),
	/** card.state.<key> */
	state: (key: string): Expr => wrapExpr(State(key)),
	/** Scale(card.params.<key>) — applies the card's scale curve */
	scaled: (key: string): Expr => wrapExpr(Scaled(key)),
	/** run.state.<key> */
	runState: (key: string): Expr => wrapExpr(RunState(key)),
	/** encounter.state.<key> */
	encState: (key: string): Expr => wrapExpr(EncState(key)),
	/** arbitrary context path */
	get: (path: string): Expr => wrapExpr(Get(path)),

	ctx: {
		cardStack: wrapExpr(ctx.cardStack),
		cardCooldown: wrapExpr(ctx.cardCooldown),
		playerHp: wrapExpr(ctx.playerHp),
		playerHpPercent: wrapExpr(ctx.playerHpPercent),
		playerBlock: wrapExpr(ctx.playerBlock),
		playerCoins: wrapExpr(ctx.playerCoins),
		playerDeckSize: wrapExpr(ctx.playerDeckSize),
		targetHp: wrapExpr(ctx.targetHp),
		targetHpPercent: wrapExpr(ctx.targetHpPercent),
		enemiesAlive: wrapExpr(ctx.enemiesAlive),
		battleTurn: wrapExpr(ctx.battleTurn),
		runFloor: wrapExpr(ctx.runFloor),
		runAct: wrapExpr(ctx.runAct),
		hostStack: wrapExpr(ctx.hostStack),
		modifierStack: wrapExpr(ctx.modifierStack),
	},
}
