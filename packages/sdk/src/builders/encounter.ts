import { Get } from '../builders/value'
import { type Expr, wrapExpr } from '../helpers/expr'
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

function dynProxy(prefix: string): Record<string, Expr> {
	return new Proxy({} as Record<string, Expr>, {
		get(_, key) {
			if (typeof key !== 'string') return undefined
			return wrapExpr(Get(`${prefix}.${key}`))
		},
	})
}

/** context available inside Encounter.intro and Encounter.outro callbacks */
export interface EncounterCallbackCtx {
	/** encounter-local state fields */
	state: Record<string, Expr>
}

const encounterCtx: EncounterCallbackCtx = {
	state: dynProxy('encounter.state'),
}

type EffectArrayInput = ((ctx: EncounterCallbackCtx) => Effect | Effect[]) | Effect[]

function resolveEffectArray(input: EffectArrayInput | undefined): Effect[] | undefined {
	if (input === undefined) return undefined
	if (typeof input === 'function') {
		const result = input(encounterCtx)
		return Array.isArray(result) ? result : [result]
	}
	return input
}

export interface EncounterOpts {
	id: string
	/** When omitted resolves to `<namespace>-encounter-<name>.title` from ftl (warning if missing) */
	title?: Text
	/** When omitted resolves to `<namespace>-encounter-<name>.body` from ftl (warning if missing) */
	body?: Text
	icon?: string
	background?: string
	condition?: Condition
	weight?: number
	triggeredOncePerRun?: boolean
	modeTags?: ModeTag[]
	actors?: Actor[]
	initialState?: Record<string, StateInit>
	/** intro effects. callback receives encounter state */
	intro?: EffectArrayInput
	choices?: Choice[]
	/** outro effects. callback receives encounter state */
	outro?: EffectArrayInput
	passiveListeners?: Listener[]
}

const encounterRenames = {
	triggeredOncePerRun: 'triggered_once_per_run',
	modeTags: 'mode_tags',
	initialState: 'initial_state',
	passiveListeners: 'passive_listeners',
}

/** define an encounter — a scripted scene with actors, dialogue, and choices */
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
			intro: resolveEffectArray(opts.intro),
			choices: opts.choices,
			outro: resolveEffectArray(opts.outro),
			passiveListeners: opts.passiveListeners,
		},
		encounterRenames,
	) as unknown as EncounterSchema
}
