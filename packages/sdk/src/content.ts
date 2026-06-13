// Content — a detached registration surface with the same builders as the
// package (grammY's Composer, minus middleware). Files declare into their
// local content() at module top level; the entry mounts them in order with
// use(). Registration is module-local, so import order never matters — the
// document order is the mount order.
//
//   // src/content/cards/attack.ts
//   export const attack = content()
//   export const strike = attack.card('strike', { ... })   // refs are plain exports
//
//   // src/content/cards/index.ts — the folder aggregator
//   export const cards = content()
//   cards.use(attack, rituals)

import {
	battlePaths,
	cardPaths,
	eventPaths,
	modPaths,
	type Params,
	playerPaths,
	selfPaths,
	targetPaths,
} from './core/paths'
import { assertIdent, makeRef, type Ref, refId } from './core/refs'
import { type CardBuildInfo, collect, pushEffect, RiftedBuildError } from './core/scope'
import { type EventSpec, eventKindOf, type PayloadOf, resolveWhen } from './hooks'
import type { LocText } from './locales/index'
import type {
	AffinitySpec,
	CardPlayCtx,
	CardSpec,
	DeferSpec,
	EncounterSpec,
	EnemySpec,
	MapSpec,
	ModifierSpec,
	NodeKindName,
	RevealSpec,
	ScaleType,
	WatcherCtx,
	WatcherSpec,
} from './specs'

const SCALES: readonly ScaleType[] = ['flat', 'linear', 'exp', 'hyp']

const NODE_KINDS: readonly NodeKindName[] = [
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
]

function checkNodeKind(kind: string, label: string): void {
	if (!NODE_KINDS.includes(kind as NodeKindName)) {
		throw new RiftedBuildError(`${label}: unknown node kind "${kind}" (${NODE_KINDS.join(', ')})`)
	}
}

export type SectionName =
	| 'affinities'
	| 'cards'
	| 'modifiers'
	| 'enemies'
	| 'watchers'
	| 'encounters'
	| 'maps'

export const SECTIONS: readonly SectionName[] = [
	'affinities',
	'cards',
	'modifiers',
	'enemies',
	'watchers',
	'encounters',
	'maps',
]

const SECTION_LABEL: Record<SectionName, string> = {
	affinities: 'affinity',
	cards: 'card',
	modifiers: 'modifier',
	enemies: 'enemy',
	watchers: 'watcher',
	encounters: 'encounter',
	maps: 'map',
}

/** a definition's localizable strings; the message id is resolved at build (needs the namespace) */
export interface StringInfo {
	kind: string
	id: string
	name?: LocText
	description?: LocText
	context: string[]
}

type Op =
	| { def: { section: SectionName; id: string; entry: Record<string, unknown>; loc?: StringInfo } }
	| { mount: Content }

/** the flattened mount tree: ordered definitions per section + their strings */
export interface Flattened {
	sections: Record<SectionName, Array<{ id: string; entry: Record<string, unknown> }>>
	strings: StringInfo[]
}

export class Content {
	/** ordered log of own definitions and mounted children */
	private readonly ops: Op[] = []

	/** mount child composers; their definitions splice in at this position */
	use(...children: Content[]): void {
		for (const child of children) {
			if (!(child instanceof Content)) {
				throw new RiftedBuildError('use(): expected a content() composer')
			}
			if (child === this) throw new RiftedBuildError('use(): cannot mount a content into itself')
			this.ops.push({ mount: child })
		}
	}

	/** which namespace to suggest in error messages (set on the package) */
	protected nsHint(): string | undefined {
		return undefined
	}

	private addDef(
		section: SectionName,
		id: string,
		entry: Record<string, unknown>,
		loc?: StringInfo,
	): void {
		assertIdent(id, `${SECTION_LABEL[section]} id`)
		this.ops.push({ def: { section, id, entry, loc } })
	}

	/** flatten the mount tree in declaration order */
	protected collectInto(out: Flattened, seen: Set<Content>): void {
		if (seen.has(this)) {
			throw new RiftedBuildError(
				'content mounted more than once (or a mount cycle) — each content() belongs to exactly one parent',
			)
		}
		seen.add(this)
		for (const op of this.ops) {
			if ('mount' in op) {
				op.mount.collectInto(out, seen)
				continue
			}
			const { section, id, entry, loc } = op.def
			if (out.sections[section].some(e => e.id === id)) {
				throw new RiftedBuildError(`${SECTION_LABEL[section]} "${id}" is defined twice`)
			}
			out.sections[section].push({ id, entry })
			if (loc) out.strings.push(loc)
		}
	}

	protected flatten(): Flattened {
		const out: Flattened = {
			sections: {
				affinities: [],
				cards: [],
				modifiers: [],
				enemies: [],
				watchers: [],
				encounters: [],
				maps: [],
			},
			strings: [],
		}
		this.collectInto(out, new Set())
		return out
	}

	private static locInfo(
		kind: string,
		id: string,
		spec: { name?: LocText; description?: LocText },
		context: string[] = [],
	): StringInfo | undefined {
		if (spec.name === undefined && spec.description === undefined) return undefined
		return { kind, id, name: spec.name, description: spec.description, context }
	}

	/** translator context: which fluent variables a definition's render exposes */
	private static renderContext(render: Record<string, unknown> | undefined): string[] {
		const keys = Object.keys(render ?? {})
		if (keys.length === 0) return []
		return [`variables: ${keys.map(k => `{ $${k} }`).join(', ')}`]
	}

	// --- definitions ---

	card<P extends Params = Params, S extends Params = Params>(
		id: string,
		spec: CardSpec<P, S>,
	): Ref<'card'> {
		const label = `card "${id}"`
		const def: Record<string, unknown> = { id }

		if (spec.cooldown !== undefined) def.cooldown = spec.cooldown
		if (spec.scale !== undefined) {
			if (!SCALES.includes(spec.scale)) {
				throw new RiftedBuildError(`${label}: unknown scale "${spec.scale}" (${SCALES.join(', ')})`)
			}
			def.scale = spec.scale
		}
		if (spec.seal !== undefined && (spec.craft !== undefined || spec.asModifier !== undefined)) {
			throw new RiftedBuildError(`${label}: "seal" already implies craft + asModifier`)
		}
		if (spec.seal !== undefined) {
			def.craft = true
			def.as_modifier = refId(spec.seal, 'modifier')
		}
		if (spec.craft) def.craft = true
		if (spec.asModifier !== undefined) def.as_modifier = refId(spec.asModifier, 'modifier')
		if (spec.affinity !== undefined) def.affinity = refId(spec.affinity, 'affinity')
		if (spec.tags) def.tags = [...spec.tags]
		if (spec.params) def.params = { ...spec.params }
		if (spec.art) def.art = { ...spec.art }

		const paths = cardPaths<P, S>()
		if (spec.render) {
			def.render = spec.render({ params: paths.params, state: paths.state, card: paths })
		}

		if (spec.onPlay) {
			const play = spec.onPlay
			let watcherSeq = 0
			let revealSeq = 0
			const owner = this
			const buildInfo: CardBuildInfo = {
				cardId: id,
				hoistWatcher(watcherDef, name, suffix) {
					const wid = name ?? `${id}_${suffix}`
					owner.addDef('watchers', wid, { id: wid, ...watcherDef })
					return wid
				},
			}
			const ctx: CardPlayCtx<P, S> = {
				params: paths.params,
				state: paths.state,
				card: paths,
				self: selfPaths(),
				target: targetPaths(),
				battle: battlePaths(),
				player: playerPaths(),
				deferCard: spec_ => this.hoistDeferred(buildInfo, spec_, () => `w${watcherSeq++}`),
				revealAfter: spec_ => this.hoistReveal(buildInfo, spec_, () => `r${revealSeq++}`),
			}
			const body = collect(`${label} onPlay`, () => play(ctx), { card: buildInfo })
			if (body !== null) def.on_play = body
		}

		if (spec.hooks) def.hooks = spec.hooks

		const context = [
			...(spec.params
				? [
						`params: ${Object.entries(spec.params)
							.map(([k, v]) => `${k}=${v}`)
							.join(', ')}`,
					]
				: []),
			...Content.renderContext(def.render as Record<string, unknown> | undefined),
		]
		this.addDef('cards', id, def, Content.locInfo('card', id, spec, context))
		return makeRef('card', id)
	}

	private hoistDeferred<P extends Params, S extends Params, E extends EventSpec>(
		card: CardBuildInfo,
		spec: DeferSpec<P, S, E>,
		nextSuffix: () => string,
	): void {
		const kind = eventKindOf(spec.on, this.nsHint())
		const ctx: WatcherCtx<E, P, S> = {
			event: eventPaths<PayloadOf<E>>(),
			card: cardPaths<P, S>(),
			player: playerPaths(),
			battle: battlePaths(),
			self: selfPaths(),
			target: targetPaths(),
		}
		if (spec.visible && !spec.id) {
			throw new RiftedBuildError(
				`card "${card.cardId}": a visible quest watcher needs an explicit id (it lands in fluent keys)`,
			)
		}
		const suffix = spec.id ? '' : nextSuffix()
		// the id is computed before collect: finish() inside the body must know itself
		const wid = spec.id ?? `${card.cardId}_${suffix}`
		const body = collect(`card "${card.cardId}" watcher "${wid}"`, () => spec.do(ctx), {
			watcherId: wid,
		})
		if (body === null) {
			throw new RiftedBuildError(`card "${card.cardId}": deferCard body is empty`)
		}
		const hook: Record<string, unknown> = { on: kind }
		if (spec.scope !== undefined) hook.scope = spec.scope
		const when = resolveWhen(spec.when, ctx)
		if (when) hook.when = when
		hook.do = body

		const def: Record<string, unknown> = { id: wid }
		if (spec.team) def.team = true
		if (spec.visible) def.visible = true
		if (spec.render) {
			def.render = spec.render({ card: cardPaths<P, S>(), player: playerPaths() })
		}
		def.hook = hook
		this.addDef(
			'watchers',
			wid,
			def,
			Content.locInfo(
				'watcher',
				wid,
				spec,
				Content.renderContext(def.render as Record<string, unknown> | undefined),
			),
		)
		// the card leaves the deck, the quest lands on the player
		pushEffect(['start_card_watcher', wid])
	}

	private hoistReveal(card: CardBuildInfo, spec: RevealSpec, nextSuffix: () => string): void {
		const kind = eventKindOf(spec.on, this.nsHint())
		const wid = spec.id ?? `${card.cardId}_${nextSuffix()}`
		this.addDef('watchers', wid, {
			id: wid,
			reveal: { on: kind, field: spec.field, threshold: spec.threshold },
		})
		pushEffect(['start_card_reveal', wid])
	}

	modifier<MP extends Params = Params>(id: string, spec: ModifierSpec<MP> = {}): Ref<'modifier'> {
		const def: Record<string, unknown> = { id }
		if (spec.tags) def.tags = [...spec.tags]
		if (spec.cooldownDelta !== undefined) def.cooldown_delta = spec.cooldownDelta
		if (spec.blocks) def.blocks = [...spec.blocks]
		if (spec.duration !== undefined) def.duration = spec.duration
		if (spec.decay) def.decay = true
		if (spec.params) def.params = { ...spec.params }
		if (spec.art) def.art = { ...spec.art }
		if (spec.render) def.render = spec.render({ mod: modPaths<MP>(), card: cardPaths() })
		if (spec.hooks) def.hooks = spec.hooks
		this.addDef(
			'modifiers',
			id,
			def,
			Content.locInfo(
				'modifier',
				id,
				spec,
				Content.renderContext(def.render as Record<string, unknown> | undefined),
			),
		)
		return makeRef('modifier', id)
	}

	enemy(id: string, spec: EnemySpec): Ref<'enemy'> {
		if (!Number.isInteger(spec.hp) || spec.hp <= 0) {
			throw new RiftedBuildError(`enemy "${id}": hp must be a positive integer`)
		}
		const def: Record<string, unknown> = { id, hp: spec.hp }
		if (spec.art) def.art = { ...spec.art }
		if (spec.hooks) def.hooks = spec.hooks
		if (spec.phases) def.phases = spec.phases
		this.addDef('enemies', id, def, Content.locInfo('enemy', id, spec))
		return makeRef('enemy', id)
	}

	watcher<E extends EventSpec>(id: string, spec: WatcherSpec<E>): Ref<'watcher'> {
		const kind = eventKindOf(spec.on, this.nsHint())
		const ctx: WatcherCtx<E> = {
			event: eventPaths<PayloadOf<E>>(),
			card: cardPaths(),
			player: playerPaths(),
			battle: battlePaths(),
			self: selfPaths(),
			target: targetPaths(),
		}
		const body = collect(`watcher "${id}"`, () => spec.do(ctx), { watcherId: id })
		if (body === null) {
			throw new RiftedBuildError(`watcher "${id}": body is empty`)
		}
		const hook: Record<string, unknown> = { on: kind }
		if (spec.scope !== undefined) hook.scope = spec.scope
		const when = resolveWhen(spec.when, ctx)
		if (when) hook.when = when
		hook.do = body

		const def: Record<string, unknown> = { id }
		if (spec.team) def.team = true
		if (spec.visible) def.visible = true
		if (spec.render) def.render = spec.render({ card: cardPaths(), player: playerPaths() })
		def.hook = hook
		this.addDef(
			'watchers',
			id,
			def,
			Content.locInfo(
				'watcher',
				id,
				spec,
				Content.renderContext(def.render as Record<string, unknown> | undefined),
			),
		)
		return makeRef('watcher', id)
	}

	encounter(id: string, spec: EncounterSpec): Ref<'encounter'> {
		const def: Record<string, unknown> = {
			id,
			enemies: spec.enemies.map(e => refId(e, 'enemy')),
		}
		if (spec.loot) {
			def.loot = spec.loot.pool.map(c => refId(c, 'card'))
			def.loot_offer = spec.loot.offer
			def.loot_picks = spec.loot.picks
		}
		this.addDef('encounters', id, def, Content.locInfo('encounter', id, spec))
		return makeRef('encounter', id)
	}

	map(id: string, spec: MapSpec): Ref<'map'> {
		const label = `map "${id}"`
		const def: Record<string, unknown> = {
			id,
			floors: spec.floors,
			width: spec.width,
			paths: spec.paths,
		}
		if (spec.fanout !== undefined) def.start_fanout = spec.fanout
		if (spec.rules) {
			const rules: Record<string, unknown> = {}
			for (const [kind, rule] of Object.entries(spec.rules)) {
				checkNodeKind(kind, label)
				const r: Record<string, unknown> = {}
				if (rule.weight !== undefined) r.weight = rule.weight
				if (rule.minFloor !== undefined) r.min_floor = rule.minFloor
				if (rule.maxFloor !== undefined) r.max_floor = rule.maxFloor
				if (rule.noAdjacent) r.no_adjacent = true
				if (rule.noConsecutive) r.no_consecutive = true
				rules[kind] = r
			}
			def.rules = rules
		}
		if (spec.forceFloors) {
			const force: Record<string, string> = {}
			for (const [floor, kind] of Object.entries(spec.forceFloors)) {
				checkNodeKind(kind, label)
				force[String(floor)] = kind
			}
			def.force_floors = force
		}
		if (spec.content) {
			const content: Record<string, string[]> = {}
			for (const [kind, refs] of Object.entries(spec.content)) {
				checkNodeKind(kind, label)
				content[kind] = (refs ?? []).map(r => refId(r, 'encounter'))
			}
			def.content = content
		}
		if (spec.tethers) {
			const t: Record<string, unknown> = {}
			if (spec.tethers.pairwise) {
				const pw = spec.tethers.pairwise
				t.pairwise = true
				if (pw.chance !== undefined) t.chance = pw.chance
				if (pw.min !== undefined) t.min = pw.min
				if (pw.minFloor !== undefined) t.min_floor = pw.minFloor
				if (pw.maxFloor !== undefined) t.max_floor = pw.maxFloor
			}
			if (spec.tethers.anchor !== undefined) {
				t.anchor = true
				t.anchor_scene = spec.tethers.anchor
			}
			def.tethers = t
		}
		this.addDef('maps', id, def, Content.locInfo('map', id, spec))
		return makeRef('map', id)
	}

	affinity(id: string, spec: AffinitySpec = {}): Ref<'affinity'> {
		const def: Record<string, unknown> = { id }
		if (spec.params) def.params = { ...spec.params }
		if (spec.render) def.render = spec.render({ player: playerPaths() })
		if (spec.art) def.art = { ...spec.art }
		this.addDef(
			'affinities',
			id,
			def,
			Content.locInfo(
				'affinity',
				id,
				spec,
				Content.renderContext(def.render as Record<string, unknown> | undefined),
			),
		)
		return makeRef('affinity', id)
	}
}

/** create a detached content composer — one per file or folder */
export function content(): Content {
	return new Content()
}
