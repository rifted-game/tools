import type { Condition } from '../schema/condition'
import type { Effect } from '../schema/effect'
import type { Listener as ListenerSchema } from '../schema/listener'

/** subscribe to an event. while the owning entity exists, every matching event runs effect */
export function Listener(opts: {
	onEvent: string
	effect: Effect
	when?: Condition
}): ListenerSchema {
	const out: any = { on_event: opts.onEvent, effect: opts.effect }
	if (opts.when !== undefined) out.when = opts.when
	return out
}
