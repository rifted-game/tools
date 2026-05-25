import type { Condition } from '../schema/condition'
import type { Effect } from '../schema/effect'
import type { IntentKind } from '../schema/enums'
import type {
	ConditionalIntent as ConditionalIntentSchema,
	IntentPattern,
	Intent as IntentSchema,
} from '../schema/intent'
import type { Text } from '../schema/primitives'
import type { Value } from '../schema/value'

interface IntentOpts {
	kind: IntentKind
	description: Text
	amount?: Value
	onExecute?: Effect
}

/** declare a single intent */
export function Intent(opts: IntentOpts): IntentSchema {
	const out: any = { kind: opts.kind, description: opts.description }
	if (opts.amount !== undefined) out.amount = opts.amount
	if (opts.onExecute !== undefined) out.on_execute = opts.onExecute
	return out
}

/** declare a conditional intent. first matching condition wins */
export function ConditionalIntent(
	opts: IntentOpts & { condition: Condition },
): ConditionalIntentSchema {
	const out: any = {
		condition: opts.condition,
		kind: opts.kind,
		description: opts.description,
	}
	if (opts.amount !== undefined) out.amount = opts.amount
	if (opts.onExecute !== undefined) out.on_execute = opts.onExecute
	return out
}

/** intent pattern that cycles through entries one per turn */
export function IntentPatternSequence(intents: IntentSchema[]): IntentPattern {
	return { kind: 'sequence', intents }
}

/** intent pattern that re-evaluates conditions each turn */
export function IntentPatternConditional(intents: ConditionalIntentSchema[]): IntentPattern {
	return { kind: 'conditional', intents }
}
