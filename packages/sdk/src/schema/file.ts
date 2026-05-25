import { z } from 'zod'

import { Asset } from './asset'
import { Buff } from './buff'
import { Card } from './card'
import { Encounter } from './encounter'
import { Enemy } from './enemy'
import { Location } from './location'
import { MatchMode } from './match-mode'
import { Relic } from './relic'
import { Summon } from './summon'

const PackageInfo = z
	.object({
		namespace: z.string().min(1),
		version: z.string().min(1),
		author: z.string().optional(),
		description: z.string().optional(),
		dependencies: z.record(z.string(), z.string()).optional(),
	})
	.strict()

// root gcf file. at least one content section must be present
export const File = z
	.object({
		format_version: z.literal(1),
		package: PackageInfo.optional(),
		assets: z.array(Asset).min(1).optional(),
		cards: z.array(Card).min(1).optional(),
		buffs: z.array(Buff).min(1).optional(),
		relics: z.array(Relic).min(1).optional(),
		enemies: z.array(Enemy).min(1).optional(),
		summons: z.array(Summon).min(1).optional(),
		encounters: z.array(Encounter).min(1).optional(),
		locations: z.array(Location).min(1).optional(),
		match_modes: z.array(MatchMode).min(1).optional(),
	})
	.strict()
	.refine(
		f =>
			!!(
				f.assets ||
				f.cards ||
				f.buffs ||
				f.relics ||
				f.enemies ||
				f.summons ||
				f.encounters ||
				f.locations ||
				f.match_modes
			),
		{ message: 'gcf file must contain at least one content section' },
	)

export type File = z.infer<typeof File>
