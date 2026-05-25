import { pack } from '../internal/pack'
import type { Actor } from '../schema/actor'
import type { Choice } from '../schema/choice'
import type { Condition } from '../schema/condition'
import type { Effect } from '../schema/effect'
import type { Encounter as EncounterSchema } from '../schema/encounter'
import type { ModeTag } from '../schema/enums'
import type { Listener } from '../schema/listener'
import type { Text } from '../schema/primitives'
import type { StateInit } from '../schema/state'

export interface EncounterOpts {
	id: string
	title?: Text
	body?: Text
	icon?: string
	background?: string
	condition?: Condition
	weight?: number
	triggeredOncePerRun?: boolean
	modeTags?: ModeTag[]
	actors?: Actor[]
	initialState?: Record<string, StateInit>
	intro?: Effect[]
	choices?: Choice[]
	outro?: Effect[]
	passiveListeners?: Listener[]
}

const encounterRenames = {
	triggeredOncePerRun: 'triggered_once_per_run',
	modeTags: 'mode_tags',
	initialState: 'initial_state',
	passiveListeners: 'passive_listeners',
}

/** define an encounter. scripted scene with actors, dialogue, and choices */
export function Encounter(opts: EncounterOpts): EncounterSchema {
	return pack(
		{ id: opts.id },
		{
			title: opts.title,
			body: opts.body,
			icon: opts.icon,
			background: opts.background,
			condition: opts.condition,
			weight: opts.weight,
			triggeredOncePerRun: opts.triggeredOncePerRun,
			modeTags: opts.modeTags,
			actors: opts.actors,
			initialState: opts.initialState,
			intro: opts.intro,
			choices: opts.choices,
			outro: opts.outro,
			passiveListeners: opts.passiveListeners,
		},
		encounterRenames,
	) as unknown as EncounterSchema
}
