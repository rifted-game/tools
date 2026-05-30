import { type IntentPatternInput, toIntentPattern } from '../builders/intent'
import { Get } from '../builders/value'
import { type Expr, wrapExpr } from '../helpers/expr'
import { pack } from '../internal/pack'
import { wrapEffect } from '../internal/wrap-effect'
import type { Condition } from '../schema/condition'
import type { Effect } from '../schema/effect'
import type { Target } from '../schema/enums'
import type { Listener } from '../schema/listener'
import type { Phase as PhaseSchema } from '../schema/phase'

function dynProxy(prefix: string): Record<string, Expr> {
	return new Proxy({} as Record<string, Expr>, {
		get(_, key) {
			if (typeof key !== 'string') return undefined
			return wrapExpr(Get(`${prefix}.${key}`))
		},
	})
}

/** context available inside Phase.onEnter and Phase.passiveListeners callbacks */
export interface PhaseCallbackCtx {
	/** Target literal that resolves to the enemy running this phase */
	self: Extract<Target, 'self'>
	/** the enemy's state fields */
	state: Record<string, Expr>
}

const phaseCtx: PhaseCallbackCtx = {
	self: 'self',
	state: dynProxy('self.state'),
}

type EffectInput = ((ctx: PhaseCallbackCtx) => Effect | Effect[]) | Effect | Effect[]
type ListenerInput = ((ctx: PhaseCallbackCtx) => Listener | Listener[]) | Listener[]

function resolveEffect(input: EffectInput | undefined): Effect | undefined {
	if (input === undefined) return undefined
	if (typeof input === 'function') return wrapEffect(input(phaseCtx))
	return wrapEffect(input)
}

function resolveListeners(input: ListenerInput | undefined): Listener[] | undefined {
	if (input === undefined) return undefined
	if (typeof input === 'function') {
		const result = input(phaseCtx)
		return Array.isArray(result) ? result : [result]
	}
	return input
}

export interface PhaseOpts {
	id: string
	intentPattern: IntentPatternInput
	/** condition that transitions to the next phase. alias: until */
	transitionCondition?: Condition
	/** alias for transitionCondition — reads as "stay in this phase until ..." */
	until?: Condition
	transitionEvent?: string
	/** effect that runs once when the phase begins. callback receives `self` and `state` */
	onEnter?: EffectInput
	/** passive listeners active while this phase is running */
	passiveListeners?: ListenerInput
}

const phaseRenames = {
	intentPattern: 'intent_pattern',
	transitionCondition: 'transition_condition',
	transitionEvent: 'transition_event',
	onEnter: 'on_enter',
	passiveListeners: 'passive_listeners',
} as const

/** define a boss phase. transition_condition or transition_event triggers the next phase */
export function Phase(opts: PhaseOpts): PhaseSchema {
	return pack(
		{ id: opts.id, intent_pattern: toIntentPattern(opts.intentPattern) },
		{
			transitionCondition: opts.transitionCondition ?? opts.until,
			transitionEvent: opts.transitionEvent,
			onEnter: resolveEffect(opts.onEnter),
			passiveListeners: resolveListeners(opts.passiveListeners),
		},
		phaseRenames,
	) as unknown as PhaseSchema
}
