import type { BuffOpts } from './builders/buff'
import { Buff } from './builders/buff'
import type { CardOpts } from './builders/card'
import { Card } from './builders/card'
import type { EncounterOpts } from './builders/encounter'
import { Encounter } from './builders/encounter'
import type { EnemyOpts } from './builders/enemy'
import { Enemy } from './builders/enemy'
import type { LocationOpts } from './builders/location'
import { Location } from './builders/location'
import type { MatchModeOpts } from './builders/match-mode'
import { MatchMode } from './builders/match-mode'
import type { RelicOpts } from './builders/relic'
import { Relic } from './builders/relic'
import type { SummonOpts } from './builders/summon'
import { Summon } from './builders/summon'

// Pkg(ns) returns builders that auto-prefix ids with the mod namespace.
// ids already containing a colon are kept verbatim (for vanilla references)

export function Pkg(ns: string) {
	const prefix = (name: string): string => (name.includes(':') ? name : `${ns}:${name}`)
	return {
		ns,
		id: prefix,
		Card: (opts: CardOpts) => Card({ ...opts, id: prefix(opts.id) }),
		Buff: (opts: BuffOpts) => Buff({ ...opts }),
		Relic: (opts: RelicOpts) => Relic({ ...opts, id: prefix(opts.id) }),
		Enemy: (opts: EnemyOpts) => Enemy({ ...opts, id: prefix(opts.id) }),
		Summon: (opts: SummonOpts) => Summon({ ...opts, id: prefix(opts.id) }),
		Encounter: (opts: EncounterOpts) => Encounter({ ...opts, id: prefix(opts.id) }),
		Location: (opts: LocationOpts) => Location({ ...opts, id: prefix(opts.id) }),
		MatchMode: (opts: MatchModeOpts) => MatchMode({ ...opts, id: prefix(opts.id) }),
	}
}

export type PkgBuilder = ReturnType<typeof Pkg>
