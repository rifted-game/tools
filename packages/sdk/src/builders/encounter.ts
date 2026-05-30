import { Get } from '../builders/value'
import { type Expr, wrapExpr } from '../helpers/expr'
import { pack } from '../internal/pack'
import type { Actor } from '../schema/actor'
import type { ActorPosition } from '../schema/actor-position'
import type { AnimationSet } from '../schema/animation'
import type { Choice } from '../schema/choice'
import type { Condition } from '../schema/condition'
import type { Effect } from '../schema/effect'
import type { Encounter as EncounterSchema } from '../schema/encounter'
import type { ModeTag } from '../schema/enums'
import type { Listener } from '../schema/listener'
import type { Text } from '../schema/primitives'
import type { StateInit } from '../schema/state'
import type { TextWithVariants } from '../schema/text-variants'
import {
	CloseEncounter,
	PlayClip,
	Say,
	SetActorPosition,
	ShowChoices,
	Wait,
} from './effect/presentation'

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

// --- scene authoring (actor speakers + timed steps) -----------------------

/** an actor declared in object form; the id comes from the map key */
export interface ActorSpec {
	name?: Text
	position?: ActorPosition
	portrait?: string
	animationSet?: AnimationSet
}

/**
 * One step of a scene. Returned by speaker methods; carries one or more effects
 * and can append a pause with `.then(seconds)`.
 */
export class SceneStep {
	constructor(readonly effects: Effect[]) {}
	/** append a pause (Wait) after this step's effects */
	then(seconds: number): SceneStep {
		return new SceneStep([...this.effects, Wait(seconds)])
	}
}

/** an actor-bound authoring handle inside a scene callback */
export interface Speaker {
	/** speak a line as this actor */
	say(text: TextWithVariants, opts?: { perPlayer?: boolean }): SceneStep
	/** play an animation clip on this actor */
	clip(clip: string, opts?: { loop?: boolean }): SceneStep
	/** move this actor to a new position over an optional duration */
	moveTo(position: ActorPosition, duration?: number): SceneStep
	/** reveal the choice buttons */
	choices(): SceneStep
	/** close the encounter and resume the run */
	close(): SceneStep
}

/** a scene step, or a bare effect (for non-actor beats like PlaySfx / a raw Wait) */
export type SceneStepInput = SceneStep | Effect

export interface SceneParts {
	intro?: SceneStepInput[]
	choices?: Choice[]
	outro?: SceneStepInput[]
}

function makeSpeaker(actorId: string): Speaker {
	return {
		say: (text, opts) =>
			new SceneStep([
				Say({
					actor: actorId,
					text,
					...(opts?.perPlayer !== undefined && { perPlayer: opts.perPlayer }),
				}),
			]),
		clip: (clip, opts) =>
			new SceneStep([
				PlayClip({ actor: actorId, clip, ...(opts?.loop !== undefined && { loop: opts.loop }) }),
			]),
		moveTo: (position, duration) =>
			new SceneStep([
				SetActorPosition({
					actor: actorId,
					position,
					...(duration !== undefined && { duration }),
				}),
			]),
		choices: () => new SceneStep([ShowChoices()]),
		close: () => new SceneStep([CloseEncounter()]),
	}
}

function flattenSteps(steps: SceneStepInput[] | undefined): Effect[] | undefined {
	if (steps === undefined) return undefined
	const out: Effect[] = []
	for (const s of steps) {
		if (s instanceof SceneStep) out.push(...s.effects)
		else out.push(s)
	}
	return out
}

function actorsToArray(actors: Record<string, ActorSpec> | Actor[]): Actor[] {
	if (Array.isArray(actors)) return actors
	return Object.entries(actors).map(([id, a]) => {
		const out: any = { id }
		if (a.name !== undefined) out.name = a.name
		if (a.position !== undefined) out.position = a.position
		if (a.portrait !== undefined) out.portrait = a.portrait
		if (a.animationSet !== undefined) out.animation_set = a.animationSet
		return out as Actor
	})
}

const encounterRenames = {
	triggeredOncePerRun: 'triggered_once_per_run',
	modeTags: 'mode_tags',
	initialState: 'initial_state',
	passiveListeners: 'passive_listeners',
} as const

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
	/** actors — object form `{ merchant: { portrait } }` (id = key) or an Actor[] */
	actors?: Record<string, ActorSpec> | Actor[]
	initialState?: Record<string, StateInit>
	/** intro effects. callback receives encounter state */
	intro?: EffectArrayInput
	choices?: Choice[]
	/** outro effects. callback receives encounter state */
	outro?: EffectArrayInput
	/**
	 * Author intro/choices/outro as one scene with actor speakers. The callback
	 * receives a speaker per declared actor; `scene` takes precedence over the
	 * standalone intro/choices/outro fields when present.
	 */
	scene?: (speakers: Record<string, Speaker>) => SceneParts
	passiveListeners?: Listener[]
}

/** define an encounter — a scripted scene with actors, dialogue, and choices */
export function Encounter(opts: EncounterOpts): EncounterSchema {
	const actorArray = opts.actors !== undefined ? actorsToArray(opts.actors) : undefined

	let introResolved = resolveEffectArray(opts.intro)
	let outroResolved = resolveEffectArray(opts.outro)
	let choices = opts.choices

	if (opts.scene !== undefined) {
		const speakers: Record<string, Speaker> = {}
		for (const a of actorArray ?? []) speakers[a.id] = makeSpeaker(a.id)
		const parts = opts.scene(speakers)
		introResolved = flattenSteps(parts.intro) ?? introResolved
		outroResolved = flattenSteps(parts.outro) ?? outroResolved
		if (parts.choices !== undefined) choices = parts.choices
	}

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
			actors: actorArray,
			initialState: opts.initialState,
			intro: introResolved,
			choices,
			outro: outroResolved,
			passiveListeners: opts.passiveListeners,
		},
		encounterRenames,
	) as unknown as EncounterSchema
}
