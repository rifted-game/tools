import { pack } from '../internal/pack'
import type { Affinity, ModeTag } from '../schema/enums'
import type { Listener } from '../schema/listener'
import type { Text } from '../schema/primitives'
import type { Relic as RelicSchema } from '../schema/relic'

export interface RelicOpts {
	id: string
	name: Text
	description: Text
	icon: string
	color: string
	affinityHint: Affinity
	passiveListeners: Listener[]
	modeTags?: ModeTag[]
}

/** define a relic. permanent passive rendered in a dedicated slot */
export function Relic(opts: RelicOpts): RelicSchema {
	const required = {
		id: opts.id,
		name: opts.name,
		description: opts.description,
		icon: opts.icon,
		color: opts.color,
		affinity_hint: opts.affinityHint,
		passive_listeners: opts.passiveListeners,
	}
	const optional = { mode_tags: opts.modeTags }
	return pack(required, optional) as unknown as RelicSchema
}
