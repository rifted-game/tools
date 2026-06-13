// Zod schema of the GCF document — what the SDK emits and the engine's
// LoadGCF consumes. Double duty: runtime validation on build()/validate and
// the source of the JSON Schema 2020-12 for editors. Definition shapes are
// validated strictly here; expression trees are checked op-by-op by the
// walker in ./ops (arity, argument kinds, did-you-mean), mirroring the
// engine loader's tables

import { z } from 'zod'
import { RiftedBuildError } from '../core/scope'
import { analyzeDocumentOps, resolveDocumentRefs } from './ops'

const ident = z
	.string()
	.regex(/^[a-z0-9_]+$/, 'ids must match [a-z0-9_]+ (namespace is added by the loader)')

const refIdent = z
	.string()
	.regex(/^[a-z0-9_]+(:[a-z0-9_]+)?$/, 'references are "name" or "ns:name"')

/** s-expression: number | path string | boolean | ["op", ...] | {bindings/payload} */
const sexpr: z.ZodType<unknown> = z
	.lazy(() =>
		z.union([z.number(), z.string(), z.boolean(), z.array(sexpr), z.record(z.string(), sexpr)]),
	)
	.meta({ id: 'sexpr' })

/** effect: an op, an implicit seq (array of arrays) or null */
const effect = z.union([z.null(), z.array(sexpr).min(1)]).meta({ id: 'effect' })

const renderMap = z.record(z.string(), sexpr)
const artMap = z.record(z.string(), z.string())
const paramsMap = z.record(z.string(), z.number())

const hookScope = z.enum(['subject', 'targeted', 'allied', 'global'])

const hook = z
	.strictObject({
		on: z.string().min(1),
		scope: hookScope.optional(),
		when: sexpr.optional(),
		do: effect,
	})
	.meta({ id: 'hook' })

export const cardSchema = z.strictObject({
	id: ident,
	cooldown: z.number().int().nonnegative().optional(),
	scale: z.enum(['flat', 'linear', 'exp', 'hyp']).optional(),
	craft: z.boolean().optional(),
	as_modifier: refIdent.optional(),
	affinity: refIdent.optional(),
	tags: z.array(z.string()).optional(),
	params: paramsMap.optional(),
	on_play: effect.optional(),
	hooks: z.array(hook).optional(),
	render: renderMap.optional(),
	art: artMap.optional(),
})

export const modifierSchema = z.strictObject({
	id: ident,
	tags: z.array(z.string()).optional(),
	cooldown_delta: z.number().int().optional(),
	blocks: z.array(z.string()).optional(),
	duration: z.number().int().nonnegative().optional(),
	decay: z.boolean().optional(),
	params: paramsMap.optional(),
	hooks: z.array(hook).optional(),
	render: renderMap.optional(),
	art: artMap.optional(),
})

const intentSchema = z
	.strictObject({
		kind: z.string().min(1),
		amount: sexpr.optional(),
		on_execute: effect.optional(),
	})
	.meta({ id: 'intent' })

const phaseSchema = z.strictObject({
	name: z.string().optional(),
	until: sexpr.optional(),
	on_enter: effect.optional(),
	steps: z.array(intentSchema).optional(),
	hooks: z.array(hook).optional(),
})

export const enemySchema = z.strictObject({
	id: ident,
	hp: z.number().int().positive(),
	hooks: z.array(hook).optional(),
	phases: z.array(phaseSchema).optional(),
	art: artMap.optional(),
})

export const watcherSchema = z
	.strictObject({
		id: ident,
		team: z.boolean().optional(),
		visible: z.boolean().optional(),
		hook: hook.optional(),
		reveal: z
			.strictObject({
				on: z.string().min(1),
				field: z.string().min(1),
				threshold: z.number(),
			})
			.optional(),
		render: renderMap.optional(),
	})
	.refine(w => (w.hook === undefined) !== (w.reveal === undefined), {
		message: 'a watcher needs exactly one of "hook" or "reveal"',
	})

export const encounterSchema = z
	.strictObject({
		id: ident,
		enemies: z.array(refIdent).optional(),
		loot: z.array(refIdent).optional(),
		loot_offer: z.number().int().positive().optional(),
		loot_picks: z.number().int().positive().optional(),
	})
	.refine(e => !e.loot || e.loot.length === 0 || (e.loot_offer && e.loot_picks), {
		message: 'loot needs positive loot_offer and loot_picks',
	})

const nodeKind = z.enum([
	'combat',
	'elite',
	'shop',
	'altar',
	'anomaly',
	'encounter',
	'swap',
	'boss',
	'arena',
	'rest',
])

const kindRule = z.strictObject({
	weight: z.number().nonnegative().optional(),
	min_floor: z.number().int().nonnegative().optional(),
	max_floor: z.number().int().nonnegative().optional(),
	no_adjacent: z.boolean().optional(),
	no_consecutive: z.boolean().optional(),
})

export const mapSchema = z.strictObject({
	id: ident,
	floors: z.number().int().gte(4, 'floors >= 4 (else fanout and pre-boss collide)'),
	width: z.number().int().gte(1),
	paths: z.number().int().gte(1),
	start_fanout: z.number().int().optional(),
	rules: z.partialRecord(nodeKind, kindRule).optional(),
	force_floors: z.record(z.string().regex(/^-?\d+$/), nodeKind).optional(),
	content: z.partialRecord(nodeKind, z.array(refIdent)).optional(),
	tethers: z
		.strictObject({
			pairwise: z.boolean().optional(),
			chance: z.number().min(0).max(1).optional(),
			min: z.number().int().nonnegative().optional(),
			min_floor: z.number().int().nonnegative().optional(),
			max_floor: z.number().int().nonnegative().optional(),
			anchor: z.boolean().optional(),
			anchor_scene: z.string().optional(),
		})
		.optional(),
})

export const affinitySchema = z.strictObject({
	id: ident,
	params: paramsMap.optional(),
	render: renderMap.optional(),
	art: artMap.optional(),
})

/** the whole GCF document — the contract between the SDK and the engine */
export const gcfDocument = z
	.strictObject({
		gcf: z.literal(1),
		namespace: ident,
		version: z.number().int().optional(),
		requires: z.record(ident, z.number().int()).optional(),
		cards: z.array(cardSchema).optional(),
		modifiers: z.array(modifierSchema).optional(),
		enemies: z.array(enemySchema).optional(),
		watchers: z.array(watcherSchema).optional(),
		encounters: z.array(encounterSchema).optional(),
		maps: z.array(mapSchema).optional(),
		affinities: z.array(affinitySchema).optional(),
	})
	.meta({ id: 'gcf' })

export type GcfDocument = z.infer<typeof gcfDocument>

/** validate a built document; throws a readable error with paths */
export function validateDocument(doc: unknown): GcfDocument {
	const res = gcfDocument.safeParse(doc)
	if (!res.success) {
		throw new RiftedBuildError(`document failed validation:\n${z.prettifyError(res.error)}`)
	}
	const analysis = analyzeDocumentOps(doc as Record<string, unknown>)
	const issues = [
		...analysis.issues,
		...resolveDocumentRefs(doc as Record<string, unknown>, analysis.refs),
	]
	if (issues.length > 0) {
		const lines = issues.map(i => `✖ ${i.path}: ${i.message}`)
		throw new RiftedBuildError(`document failed op validation:\n${lines.join('\n')}`)
	}
	return res.data
}

/** JSON Schema 2020-12 for editors and external tools */
export function toJsonSchema(): Record<string, unknown> {
	return z.toJSONSchema(gcfDocument, { target: 'draft-2020-12', reused: 'ref' }) as Record<
		string,
		unknown
	>
}
