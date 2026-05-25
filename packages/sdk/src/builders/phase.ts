import { pack } from '../internal/pack'
import type { Condition } from '../schema/condition'
import type { Effect } from '../schema/effect'
import type { IntentPattern } from '../schema/intent'
import type { Listener } from '../schema/listener'
import type { Phase as PhaseSchema } from '../schema/phase'

export interface PhaseOpts {
	id: string
	intentPattern: IntentPattern
	transitionCondition?: Condition
	transitionEvent?: string
	onEnter?: Effect
	passiveListeners?: Listener[]
}

const phaseRenames = {
	intentPattern: 'intent_pattern',
	transitionCondition: 'transition_condition',
	transitionEvent: 'transition_event',
	onEnter: 'on_enter',
	passiveListeners: 'passive_listeners',
}

/** define a boss phase. transition_condition or transition_event triggers the next phase */
export function Phase(opts: PhaseOpts): PhaseSchema {
	return pack(
		{ id: opts.id, intent_pattern: opts.intentPattern },
		{
			transitionCondition: opts.transitionCondition,
			transitionEvent: opts.transitionEvent,
			onEnter: opts.onEnter,
			passiveListeners: opts.passiveListeners,
		},
		phaseRenames,
	) as unknown as PhaseSchema
}
