import type { Asset } from '../schema/asset'
import type { Buff } from '../schema/buff'
import type { Card } from '../schema/card'
import type { Encounter } from '../schema/encounter'
import type { Enemy } from '../schema/enemy'
import type { File as FileSchema } from '../schema/file'
import { File as FileZod } from '../schema/file'
import type { LocaleFile } from '../schema/locale'
import type { Location } from '../schema/location'
import type { MatchMode } from '../schema/match-mode'
import type { Relic } from '../schema/relic'
import type { Summon } from '../schema/summon'

interface PackageOpts {
	namespace: string
	version: string
	name?: string
	author?: string
	description?: string
	homepage?: string
	license?: string
	/** semver range checked by the engine at load time, e.g. `">=0.5.0 <0.7.0"` */
	riftedVersion?: string
	dependencies?: Record<string, string>
	/**
	 * Translation mod marker. When set, this mod may only contain locales — no
	 * content sections. List the namespaces whose strings are being translated.
	 */
	translates?: string[]
}

interface FileOpts {
	package?: PackageOpts
	locales?: LocaleFile[]
	assets?: Asset[]
	cards?: Card[]
	buffs?: Buff[]
	relics?: Relic[]
	enemies?: Enemy[]
	summons?: Summon[]
	encounters?: Encounter[]
	locations?: Location[]
	matchModes?: MatchMode[]
}

const PKG_RENAMES: Record<string, string> = { riftedVersion: 'rifted_version' }

function serializePackage(p: PackageOpts): Record<string, unknown> {
	const out: any = { namespace: p.namespace, version: p.version }
	for (const [k, v] of Object.entries(p)) {
		if (k === 'namespace' || k === 'version' || v === undefined) continue
		out[PKG_RENAMES[k] ?? k] = v
	}
	return out
}

/**
 * Build the root gcf file. Validates the full document before returning and
 * throws with a precise path if anything fails.
 */
export function File(opts: FileOpts): FileSchema {
	const raw: any = { format_version: 1 }
	if (opts.package !== undefined) raw.package = serializePackage(opts.package)
	if (opts.locales !== undefined) raw.locales = opts.locales
	if (opts.assets !== undefined) raw.assets = opts.assets
	if (opts.cards !== undefined) raw.cards = opts.cards
	if (opts.buffs !== undefined) raw.buffs = opts.buffs
	if (opts.relics !== undefined) raw.relics = opts.relics
	if (opts.enemies !== undefined) raw.enemies = opts.enemies
	if (opts.summons !== undefined) raw.summons = opts.summons
	if (opts.encounters !== undefined) raw.encounters = opts.encounters
	if (opts.locations !== undefined) raw.locations = opts.locations
	if (opts.matchModes !== undefined) raw.match_modes = opts.matchModes
	// JSON round-trip strips non-serializable properties (e.g. methods on fluent Expr values)
	// before zod's strict schema validation runs
	return FileZod.parse(JSON.parse(JSON.stringify(raw))) as unknown as FileSchema
}

/** declare a locale file entry */
export function Locale(opts: { lang: string; path: string }): LocaleFile {
	return { lang: opts.lang, path: opts.path }
}
