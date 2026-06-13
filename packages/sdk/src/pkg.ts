// Pkg — the root of the authoring surface: one package = one GCF document =
// one namespace. It extends the Content composer (./content) with the
// namespace-bound pieces: state and event handles, document assembly and the
// localization build.
//
//   const pkg = Pkg('mymod')
//   const coins = pkg.playerState('coins')   // handles are pure values
//   pkg.use(core, cards, world)              // mount order = document order
//   export default pkg
//
// build() flattens the mount tree, serializes, and validates the document
// (schema + op tables + reference integrity — a forgotten use() fails the
// build here, not at engine load).
//
// Strings (name/description) never enter gcf.json — the engine rejects
// unknown fields and carries no presentation data. They compile into fluent
// files via locales() (see ./locales).

import { Content, SECTIONS } from './content'
import { EventHandle } from './core/event-handle'
import { assertValue, type Cap, Cond, type ExprLike } from './core/expr'
import { type Params, StateEntry } from './core/paths'
import { assertIdent } from './core/refs'
import { RiftedBuildError, ser } from './core/scope'
import {
	buildLocales,
	type LocalesBuild,
	type LocEntry,
	type LocText,
	locMessageId,
} from './locales/index'
import { validateDocument } from './schema/index'

export interface PkgOptions {
	/** integer document version (other mods' requires compare against it) */
	version?: number
	/** human-readable mod name (.rmod manifest) */
	name?: string
	/** semver of the .rmod distribution */
	semver?: string
	authors?: string[]
	/** dependencies: namespace → minimum document version */
	requires?: Record<string, number>
	/** locale that bare-string texts belong to (default "en") */
	defaultLocale?: string
}

export interface PkgMeta {
	readonly namespace: string
	readonly name: string
	readonly semver: string
	readonly authors: readonly string[]
	readonly defaultLocale: string
}

/** a player state entry: Expr + inc/set + a spend condition */
export class PlayerStateHandle extends StateEntry<never> {
	constructor(private readonly fullKey: string) {
		super(`player.state.${fullKey}`, 'player', fullKey)
	}

	/** spend with a non-negative guard: a Cond with a side effect (core semantics) */
	spend<M extends Cap = never>(amount: ExprLike<M>): Cond<M> {
		assertValue(amount, '.spend()')
		return new Cond(['spend_player_state', this.fullKey, amount])
	}
}

/** a function-style content module — for content that needs the package itself */
export type ContentModule<R = void> = (pkg: RiftedPkg) => R

/** identity helper that types a function-style module: export default defineContent(...) */
export function defineContent<R>(fn: ContentModule<R>): ContentModule<R> {
	return fn
}

export class RiftedPkg extends Content {
	readonly namespace: string
	readonly meta: PkgMeta
	private readonly version: number
	private readonly requires?: Record<string, number>

	constructor(namespace: string, opts: PkgOptions = {}) {
		super()
		if (!/^[a-z0-9_]+$/.test(namespace)) {
			throw new RiftedBuildError(`Pkg("${namespace}"): namespace must match [a-z0-9_]+`)
		}
		this.namespace = namespace
		this.version = opts.version ?? 1
		this.requires = opts.requires
		this.meta = {
			namespace,
			name: opts.name ?? namespace,
			semver: opts.semver ?? '0.1.0',
			authors: opts.authors ?? [],
			defaultLocale: opts.defaultLocale ?? 'en',
		}
	}

	protected override nsHint(): string {
		return this.namespace
	}

	/** mount content composers (document order = mount order) */
	override use(...children: Content[]): void
	/** run a function-style module now and return its exports */
	override use<R>(module: ContentModule<R>): R
	override use(...items: Array<Content | ContentModule<unknown>>): unknown {
		let last: unknown
		for (const item of items) {
			if (item instanceof Content) super.use(item)
			else if (typeof item === 'function') last = item(this)
			else throw new RiftedBuildError('use(): expected a content() composer or a module function')
		}
		return items.length === 1 && typeof items[0] === 'function' ? last : undefined
	}

	// --- state and events ---

	/** run-scoped player state, key "ns:key" */
	playerState(key: string): PlayerStateHandle {
		assertIdent(key, 'playerState key')
		return new PlayerStateHandle(`${this.namespace}:${key}`)
	}

	/** team state, key "ns:key" */
	teamState(key: string): StateEntry<never> {
		assertIdent(key, 'teamState key')
		const full = `${this.namespace}:${key}`
		return new StateEntry(`team.state.${full}`, 'team', full)
	}

	/** match state, key "ns:key" */
	matchState(key: string): StateEntry<never> {
		assertIdent(key, 'matchState key')
		const full = `${this.namespace}:${key}`
		return new StateEntry(`match.state.${full}`, 'match', full)
	}

	/**
	 * the package's custom event. The shape types the payload both in emit
	 * and in subscribers: pkg.event('jackpot', { roll: 0 })
	 */
	event<S extends Params = Record<never, number>>(name: string, _shape?: S): EventHandle<S> {
		assertIdent(name, 'event name')
		return new EventHandle<S>(`${this.namespace}:${name}`)
	}

	// --- build ---

	/** assemble the GCF document: flatten mounts, serialize, validate */
	build(): Record<string, unknown> {
		const flat = this.flatten()
		const doc: Record<string, unknown> = {
			gcf: 1,
			namespace: this.namespace,
			version: this.version,
		}
		if (this.requires && Object.keys(this.requires).length > 0) doc.requires = this.requires
		for (const section of SECTIONS) {
			const entries = flat.sections[section]
			if (entries.length === 0) continue
			doc[section] = entries.map(e => ser(e.entry))
		}
		validateDocument(doc)
		return doc
	}

	/** the localization side of the package: inline strings → fluent files */
	locales(): LocalesBuild {
		const flat = this.flatten()
		const entries: LocEntry[] = flat.strings.map(s => {
			const attrs: Record<string, LocText> = {}
			if (s.name !== undefined) attrs.name = s.name
			if (s.description !== undefined) attrs.description = s.description
			return {
				id: locMessageId(s.kind, this.namespace, s.id),
				comment: [`${s.kind} ${this.namespace}:${s.id}`, ...s.context].join(' — '),
				attrs,
			}
		})
		return buildLocales(entries, this.meta.defaultLocale)
	}

	/** JSON.stringify(pkg) yields the finished document */
	toJSON(): Record<string, unknown> {
		return this.build()
	}
}

/** create a content package: one Pkg = one gcf document = one namespace */
export function Pkg(namespace: string, opts: PkgOptions = {}): RiftedPkg {
	return new RiftedPkg(namespace, opts)
}
