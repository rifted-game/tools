import { wrapEffect } from '../internal/wrap-effect'
import type { Choice as ChoiceSchema } from '../schema/choice'
import type { Condition } from '../schema/condition'
import type { Effect } from '../schema/effect'
import type { Text } from '../schema/primitives'

/** one option in an encounter prompt. condition gates availability */
export function Choice(opts: {
	label: Text
	condition?: Condition
	hideIfDisabled?: boolean
	onSelect?: Effect | Effect[]
	effect?: Effect | Effect[]
}): ChoiceSchema {
	const out: any = { label: opts.label }
	if (opts.condition !== undefined) out.condition = opts.condition
	if (opts.hideIfDisabled !== undefined) out.hide_if_disabled = opts.hideIfDisabled
	if (opts.onSelect !== undefined) out.on_select = wrapEffect(opts.onSelect)
	if (opts.effect !== undefined) out.effect = wrapEffect(opts.effect)
	return out
}
