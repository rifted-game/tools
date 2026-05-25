import { z } from 'zod'

import { _registerCondition, ValueLazy } from './dsl-lazy'
import type { Value } from './value'

// condition DSL — evaluates to bool at runtime.
// each variant has exactly one discriminator key
export type Condition =
	| { formula: string }
	| { lt: [Value, Value] }
	| { gt: [Value, Value] }
	| { lte: [Value, Value] }
	| { gte: [Value, Value] }
	| { eq: [Value, Value] }
	| { neq: [Value, Value] }
	| { and: Condition[] }
	| { or: Condition[] }
	| { not: Condition }

const conditionLazy: z.ZodType<Condition> = z.lazy(() => Condition)

// use ValueLazy for comparison pairs to avoid accessing Value before initialization
const cmpPair = z.tuple([ValueLazy, ValueLazy])

export const Condition: z.ZodType<Condition> = z.union([
	z.object({ formula: z.string().min(1) }).strict(),
	z.object({ lt: cmpPair }).strict(),
	z.object({ gt: cmpPair }).strict(),
	z.object({ lte: cmpPair }).strict(),
	z.object({ gte: cmpPair }).strict(),
	z.object({ eq: cmpPair }).strict(),
	z.object({ neq: cmpPair }).strict(),
	z.object({ and: z.array(conditionLazy).min(2) }).strict(),
	z.object({ or: z.array(conditionLazy).min(2) }).strict(),
	z.object({ not: conditionLazy }).strict(),
])

// register after const is initialized so ValueLazy can resolve us
_registerCondition(Condition)
