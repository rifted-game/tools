import { z } from 'zod'
import type { Condition } from './condition'
import { _registerValue, ConditionLazy } from './dsl-lazy'
import { ContextPath } from './primitives'

// value DSL — evaluates to a float64 at runtime.
// recursive via z.lazy(). TypeScript alias is declared separately because
// z.infer cannot resolve lazy references on its own
export type Value =
	| number
	| { get: string }
	| { formula: string }
	| { scale: Value }
	| { add: Value[] }
	| { sub: [Value, Value] }
	| { mul: Value[] }
	| { div: [Value, Value] }
	| { min: Value[] }
	| { max: Value[] }
	| { if: Condition; then: Value; else: Value }
	| { let: Record<string, Value>; in: Value }

const valueLazy: z.ZodType<Value> = z.lazy(() => Value)

export const Value: z.ZodType<Value> = z.union([
	z.number(),
	z.object({ get: ContextPath }).strict(),
	z.object({ formula: z.string().min(1) }).strict(),
	z.object({ scale: valueLazy }).strict(),
	z.object({ add: z.array(valueLazy).min(2) }).strict(),
	z.object({ sub: z.tuple([valueLazy, valueLazy]) }).strict(),
	z.object({ mul: z.array(valueLazy).min(2) }).strict(),
	z.object({ div: z.tuple([valueLazy, valueLazy]) }).strict(),
	z.object({ min: z.array(valueLazy).min(2) }).strict(),
	z.object({ max: z.array(valueLazy).min(2) }).strict(),
	z.lazy(() =>
		z
			.object({
				if: ConditionLazy,
				then: valueLazy,
				else: valueLazy,
			})
			.strict(),
	),
	z.object({ let: z.record(z.string(), valueLazy), in: valueLazy }).strict(),
])

// register after const is initialized so ConditionLazy can resolve us
_registerValue(Value)
