import type { ModifierTrigger } from '../schema/enums'
import type { Listener } from '../schema/listener'
import type { AsModifier as AsModifierSchema } from '../schema/modifier'
import type { Value } from '../schema/value'

/** plain-object input for an asModifier block */
export interface AsModifierOpts {
	/**
	 * When this modifier activates. Gates the listener and determines render updates.
	 *
	 * `host_played` — fires when the host card is played (most common for damage/support mods).
	 * `permanent` — always active, re-evaluated every frame.
	 * Other values gate on specific game events.
	 *
	 * Note: trigger and listener.onEvent serve different roles — trigger gates when the
	 * modifier is active, listener.onEvent is the event it reacts to within that window.
	 */
	trigger: ModifierTrigger
	/** listener that runs while this modifier is attached to its host */
	listener: Listener
	/** per-modifier values merged into the host card's render context */
	renderContribution?: Record<string, Value>
}

/**
 * Build a modifier definition. Required when composing a modifier value outside CardOpts
 * (e.g. inside a Buff or as a standalone variable).
 *
 * When used directly inside `CardOpts.asModifier`, the plain object form is accepted —
 * no need to wrap in AsModifier().
 */
export function AsModifier(opts: AsModifierOpts): AsModifierSchema {
	const out: any = { trigger: opts.trigger, listener: opts.listener }
	if (opts.renderContribution !== undefined) out.render_contribution = opts.renderContribution
	return out
}
