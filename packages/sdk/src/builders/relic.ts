import { pack } from '../internal/pack'
import type { Affinity, ModeTag } from '../schema/enums'
import type { Listener } from '../schema/listener'
import type { Text } from '../schema/primitives'
import type { Relic as RelicSchema } from '../schema/relic'

export interface RelicOpts {
	id: string
	/** When omitted resolves to `<namespace>-relic-<name>.name` from ftl */
	name?: Text
	/** When omitted resolves to `<namespace>-relic-<name>.description` */
	description?: Text
	icon: string
	color: string
	affinityHint: Affinity
	passiveListeners: Listener[]
	modeTags?: ModeTag[]
}

/** define a relic — a permanent passive rendered in a dedicated slot */
export function Relic(opts: RelicOpts): RelicSchema {
	const required = {
		id: opts.id,
		icon: opts.icon,
		color: opts.color,
		affinity_hint: opts.affinityHint,
		passive_listeners: opts.passiveListeners,
	}
	const optional = {
		name: opts.name,
		description: opts.description,
		mode_tags: opts.modeTags,
	}
	return pack(required, optional) as unknown as RelicSchema
}
