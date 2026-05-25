// lazy forward references to break the Value↔Condition circular dependency.
// neither value.ts nor condition.ts imports the other at runtime.
// both import from this file instead — which has no runtime deps on either.
// they call the register functions at the END of their module body (after const init).

import { z } from 'zod'
import type { Condition } from './condition'
import type { Value } from './value'

let _value: z.ZodType<Value>
let _condition: z.ZodType<Condition>

export function _registerValue(s: z.ZodType<Value>): void {
	_value = s
}

export function _registerCondition(s: z.ZodType<Condition>): void {
	_condition = s
}

/** lazy ref to the Value schema — only valid after module load completes */
export const ValueLazy: z.ZodType<Value> = z.lazy(() => _value)

/** lazy ref to the Condition schema — only valid after module load completes */
export const ConditionLazy: z.ZodType<Condition> = z.lazy(() => _condition)
