import type { Asset } from '../schema/asset'
import type { Buff } from '../schema/buff'
import type { Card } from '../schema/card'
import type { Encounter } from '../schema/encounter'
import type { Enemy } from '../schema/enemy'
import type { File as FileSchema } from '../schema/file'
import { File as FileZod } from '../schema/file'
import type { Location } from '../schema/location'
import type { MatchMode } from '../schema/match-mode'
import type { Relic } from '../schema/relic'
import type { Summon } from '../schema/summon'

interface FileOpts {
	package?: {
		namespace: string
		version: string
		author?: string
		description?: string
		dependencies?: Record<string, string>
	}
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

/**
 * build the root gcf file. validates the full document via zod before returning.
 * throws with a precise path to the problem if anything is invalid.
 */
export function File(opts: FileOpts): FileSchema {
	const raw: any = { format_version: 1 }
	if (opts.package !== undefined) raw.package = opts.package
	if (opts.assets !== undefined) raw.assets = opts.assets
	if (opts.cards !== undefined) raw.cards = opts.cards
	if (opts.buffs !== undefined) raw.buffs = opts.buffs
	if (opts.relics !== undefined) raw.relics = opts.relics
	if (opts.enemies !== undefined) raw.enemies = opts.enemies
	if (opts.summons !== undefined) raw.summons = opts.summons
	if (opts.encounters !== undefined) raw.encounters = opts.encounters
	if (opts.locations !== undefined) raw.locations = opts.locations
	if (opts.matchModes !== undefined) raw.match_modes = opts.matchModes
	return FileZod.parse(raw) as unknown as FileSchema
}
