// A package's custom event: the handle carries the full kind ("ns:name")
// and the payload shape — typing both emit and event.* reads in subscribers

import { snakeKey } from './events'
import { assertValue, type ExprLike } from './expr'
import type { Params } from './paths'
import { pushEffect } from './scope'

export class EventHandle<S extends Params = Params> {
	declare readonly __shape?: S

	constructor(
		/** full event kind on the wire: "ns:name" */
		readonly kind: string,
	) {}

	/** push the event into the scene queue (payload typed by the shape) */
	emit(payload?: { [K in keyof S]: ExprLike }): void {
		if (!payload || Object.keys(payload).length === 0) {
			pushEffect(['emit', this.kind])
			return
		}
		const out: Record<string, unknown> = {}
		for (const [k, v] of Object.entries(payload)) {
			assertValue(v, `emit ${this.kind} payload.${k}`)
			out[snakeKey(k)] = v
		}
		pushEffect(['emit', this.kind, out])
	}
}
