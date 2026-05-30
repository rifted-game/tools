import { wrapEffect } from '../internal/wrap-effect'
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
	onExecute?: Effect | Effect[]
}

/** declare a single intent */
export function Intent(opts: IntentOpts): IntentSchema {
	const out: any = { kind: opts.kind, description: opts.description }
	if (opts.amount !== undefined) out.amount = opts.amount
	if (opts.onExecute !== undefined) out.on_execute = wrapEffect(opts.onExecute)
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
	if (opts.onExecute !== undefined) out.on_execute = wrapEffect(opts.onExecute)
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

/**
 * What an entity's `intentPattern` accepts: an explicit IntentPattern, or a bare
 * array of intents. A plain `Intent[]` becomes a sequence pattern; a
 * `ConditionalIntent[]` (entries carry `condition`) becomes a conditional pattern.
 */
export type IntentPatternInput = IntentPattern | IntentSchema[] | ConditionalIntentSchema[]

/** normalize an IntentPatternInput to an IntentPattern, inferring kind from the entries */
export function toIntentPattern(input: IntentPatternInput): IntentPattern {
	if (!Array.isArray(input)) return input
	if (input.length < 1) throw new Error('intent pattern requires at least 1 intent')
	const conditionalCount = input.filter(i => 'condition' in i).length
	if (conditionalCount === 0) return { kind: 'sequence', intents: input as IntentSchema[] }
	if (conditionalCount === input.length) {
		return { kind: 'conditional', intents: input as ConditionalIntentSchema[] }
	}
	throw new Error('intent pattern cannot mix plain and conditional intents — use all or none')
}
