import { pack } from '../internal/pack'
import type { Buff as BuffSchema } from '../schema/buff'
import type { Affinity, BuffKind, EngineFlag } from '../schema/enums'
import type { Listener } from '../schema/listener'
import type { Text } from '../schema/primitives'

export interface BuffOpts {
	id: string
	/**
	 * When omitted resolves to `<package.namespace>-buff-<id>.name` from ftl.
	 * Note: buff ids are bare (no colon), namespace comes from the file's package block.
	 */
	name?: Text
	/** When omitted resolves to `<package.namespace>-buff-<id>.description` */
	description?: Text
	icon: string
	color: string
	showStacks: boolean
	showDuration: boolean
	kind: BuffKind
	warnPlayer?: boolean
	affinityHint?: Affinity
	engineFlags?: EngineFlag[]
	/** immutable per-definition data shared across all instances of this buff */
	params?: Record<string, number>
	/** per-instance mutable state. each key seeds buff.state on apply */
	initialState?: Record<string, { const: number } | { random_int: { min: number; max: number } }>
	passiveListeners?: Listener[]
}

const buffRenames = {
	showStacks: 'show_stacks',
	showDuration: 'show_duration',
	warnPlayer: 'warn_player',
	affinityHint: 'affinity_hint',
	engineFlags: 'engine_flags',
	initialState: 'initial_state',
	passiveListeners: 'passive_listeners',
}

/** define a buff or debuff. listeners activate on the owner while duration > 0 */
export function Buff(opts: BuffOpts): BuffSchema {
	const required = {
		id: opts.id,
		icon: opts.icon,
		color: opts.color,
		show_stacks: opts.showStacks,
		show_duration: opts.showDuration,
		kind: opts.kind,
	}
	const optional = {
		name: opts.name,
		description: opts.description,
		warnPlayer: opts.warnPlayer,
		affinityHint: opts.affinityHint,
		engineFlags: opts.engineFlags,
		params: opts.params,
		initialState: opts.initialState,
		passiveListeners: opts.passiveListeners,
	}
	return pack(required, optional, buffRenames) as unknown as BuffSchema
}
