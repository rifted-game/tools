import type { ModifierTrigger } from '../schema/enums'
import type { Listener } from '../schema/listener'
import type { AsModifier as AsModifierSchema } from '../schema/modifier'
import type { Value } from '../schema/value'

/** behavior of a donor card while attached to a host. trigger gates when the listener fires */
export function AsModifier(opts: {
	trigger: ModifierTrigger
	listener: Listener
	renderContribution?: Record<string, Value>
}): AsModifierSchema {
	const out: any = { trigger: opts.trigger, listener: opts.listener }
	if (opts.renderContribution !== undefined) out.render_contribution = opts.renderContribution
	return out
}
