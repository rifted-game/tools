import { pack } from '../internal/pack'
import type { Buff as BuffSchema } from '../schema/buff'
import type { Affinity, BuffKind, EngineFlag } from '../schema/enums'
import type { Listener } from '../schema/listener'
import type { Text } from '../schema/primitives'

export interface BuffOpts {
	id: string
	name: Text
	description: Text
	icon: string
	color: string
	showStacks: boolean
	showDuration: boolean
	kind: BuffKind
	warnPlayer?: boolean
	affinityHint?: Affinity
	engineFlags?: EngineFlag[]
	passiveListeners?: Listener[]
}

const buffRenames = {
	showStacks: 'show_stacks',
	showDuration: 'show_duration',
	warnPlayer: 'warn_player',
	affinityHint: 'affinity_hint',
	engineFlags: 'engine_flags',
	passiveListeners: 'passive_listeners',
}

/** define a buff or debuff. listeners activate on the owner while duration > 0 */
export function Buff(opts: BuffOpts): BuffSchema {
	const required = {
		id: opts.id,
		name: opts.name,
		description: opts.description,
		icon: opts.icon,
		color: opts.color,
		show_stacks: opts.showStacks,
		show_duration: opts.showDuration,
		kind: opts.kind,
	}
	const optional = {
		warnPlayer: opts.warnPlayer,
		affinityHint: opts.affinityHint,
		engineFlags: opts.engineFlags,
		passiveListeners: opts.passiveListeners,
	}
	return pack(required, optional, buffRenames) as unknown as BuffSchema
}
