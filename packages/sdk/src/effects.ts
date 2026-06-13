// Effect statements: calling one inside onPlay/hook/do registers an effect
// in the current collector scope. Card bodies read like ordinary code:
//
//   onPlay({ params }) {
//     const roll = rand(1, 6)
//     when(roll.gt(4), () => dmg('selected', params.base.scaled().mul(roll)))
//       .otherwise(() => selfDmg(roll.div(2).ceil()))
//   }

import { TARGETS, type TargetSel } from './core/dict'
import { assertValue, type Cap, Cond, type ExprLike } from './core/expr'
import { type RefLike, refId } from './core/refs'
import {
	collectChild,
	consumeCond,
	currentWatcherId,
	pushEffect,
	RiftedBuildError,
	requireScope,
} from './core/scope'
import type { HookDef } from './hooks'
import type { IntentDef } from './intent'

export type { TargetSel } from './core/dict'

function tgt(t: TargetSel, where: string): TargetSel {
	if (!TARGETS.has(t)) {
		throw new RiftedBuildError(
			`${where}: unknown target "${t}" (known: ${[...TARGETS].join(', ')})`,
		)
	}
	return t
}

function val(x: ExprLike, where: string): ExprLike {
	assertValue(x, where)
	return x
}

// --- battle ---

/** deal damage through the intent pipeline (modifiers get to interfere) */
export function dmg(target: TargetSel, amount: ExprLike): void {
	pushEffect(['damage', tgt(target, 'dmg'), val(amount, 'dmg(amount)')])
}

export function heal(target: TargetSel, amount: ExprLike): void {
	pushEffect(['heal', tgt(target, 'heal'), val(amount, 'heal(amount)')])
}

/** gain block on self (the effect source) */
export function block(amount: ExprLike): void {
	pushEffect(['block', val(amount, 'block(amount)')])
}

/** direct self-damage, bypassing the intent pipeline and block */
export function selfDmg(amount: ExprLike): void {
	pushEffect(['self_damage', val(amount, 'selfDmg(amount)')])
}

// --- damage_intent: adjustments to the current hit's payload ---

export function addBaseDamage(amount: ExprLike): void {
	pushEffect(['damage_add', val(amount, 'addBaseDamage(amount)')])
}

export function mulDamage(factor: ExprLike): void {
	pushEffect(['damage_mul', val(factor, 'mulDamage(factor)')])
}

export function overrideDamage(amount: ExprLike): void {
	pushEffect(['damage_override', val(amount, 'overrideDamage(amount)')])
}

// --- the context card and the deck ---

/** change the context card's stack right in the run (never drops below 1) */
export function addStack(n: ExprLike): void {
	pushEffect(['add_card_stack', val(n, 'addStack(n)')])
}

/** replay the context card's OnPlay n times (echo seals) */
export function replayCard(times: ExprLike): void {
	pushEffect(['replay_card', val(times, 'replayCard(times)')])
}

/** replay the last played card; with probability botch the misfire hits the source */
export function replayLast(botch: ExprLike, botchPerStack: ExprLike): void {
	pushEffect([
		'replay_last',
		val(botch, 'replayLast(botch)'),
		val(botchPerStack, 'replayLast(botchPerStack)'),
	])
}

export function reduceCooldowns(n: ExprLike, ...tags: string[]): void {
	pushEffect(['reduce_cooldowns', val(n, 'reduceCooldowns(n)'), ...tags])
}

export function shrinkHand(n: ExprLike): void {
	pushEffect(['shrink_hand', val(n, 'shrinkHand(n)')])
}

// --- modifiers, summons, affinities ---

/** spectral modifier on the player owning the source */
export function applyModSelf(mod: RefLike<'modifier'>, stack: ExprLike = 1): void {
	pushEffect(['apply_mod', 'self', refId(mod, 'modifier'), val(stack, 'applyModSelf(stack)')])
}

/** spectral modifier on the player owning the target */
export function applyModTarget(mod: RefLike<'modifier'>, stack: ExprLike = 1): void {
	pushEffect(['apply_mod', 'target', refId(mod, 'modifier'), val(stack, 'applyModTarget(stack)')])
}

/** summon a unit onto the source's side */
export function summon(hp: ExprLike, intent?: IntentDef, hooks?: HookDef[]): void {
	const node: unknown[] = ['summon', val(hp, 'summon(hp)')]
	if (intent) node.push(intent)
	if (hooks) node.push(hooks)
	pushEffect(node)
}

/** attach the acting player to an affinity */
export function setAffinity(affinity: RefLike<'affinity'>): void {
	pushEffect(['set_affinity', refId(affinity, 'affinity')])
}

export function noop(): void {
	pushEffect(['noop'])
}

// --- watchers ---

/** raise an above-battle trigger on the acting player */
export function start(watcher: RefLike<'watcher'>): void {
	pushEffect(['start_watcher', refId(watcher, 'watcher')])
}

/** raise a trigger on the player owning the target */
export function startOn(watcher: RefLike<'watcher'>): void {
	pushEffect(['start_watcher_on', refId(watcher, 'watcher')])
}

/**
 * finish a trigger (a deferred card merges back into the deck).
 * Without an argument it finishes itself: valid inside a watcher's do body
 */
export function finish(watcher?: RefLike<'watcher'>): void {
	const id = watcher ? refId(watcher, 'watcher') : currentWatcherId()
	if (!id) {
		throw new RiftedBuildError(
			'finish() without an argument only works inside a watcher body — pass the watcher reference',
		)
	}
	pushEffect(['finish_watcher', id])
}

// --- branching ---

export interface Otherwise {
	otherwise(els: () => void): void
}

/**
 * runtime branching on a battle condition. Both branches are collected at
 * build time, the engine picks one in battle. Plain JS `if` remains the
 * build-time branch over ordinary values — never put a Cond in it
 * (leak-tracking catches that)
 */
export function when(cond: Cond<Cap>, then: () => void): Otherwise {
	requireScope('when()')
	if (!(cond instanceof Cond)) {
		throw new RiftedBuildError(
			'when(): expected a Cond (e.g. roll.gt(4)) — JS booleans belong in a plain if',
		)
	}
	consumeCond(cond)
	const node: unknown[] = ['if', cond, collectChild(then)]
	pushEffect(node)
	return {
		otherwise(els: () => void) {
			if (node.length > 3) throw new RiftedBuildError('when(): otherwise() already set')
			node.push(collectChild(els))
		},
	}
}

/** probabilistic branch: p ∈ [0,1] */
export function chance(p: ExprLike, then: () => void): Otherwise {
	requireScope('chance()')
	const node: unknown[] = ['chance', val(p, 'chance(p)'), collectChild(then)]
	pushEffect(node)
	return {
		otherwise(els: () => void) {
			if (node.length > 3) throw new RiftedBuildError('chance(): otherwise() already set')
			node.push(collectChild(els))
		},
	}
}
