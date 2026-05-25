import { z } from 'zod'
// re-export Effect type separately so builders can use `import type { Effect }`
// without the const/type name collision that happens with a plain re-export
import type { Effect as EffectType } from './base'
import { _registerEffect } from './base'
import { battleEffects } from './battle'
import { cardEffects } from './cards'
import { compositeEffects } from './composite'
import { presentationEffects } from './presentation'
import { runEffects } from './run'
import { screenEffects } from './screen'
import { summonEffects } from './summon'

const allBranches = [
	...battleEffects,
	...cardEffects,
	...compositeEffects,
	...summonEffects,
	...runEffects,
	...screenEffects,
	...presentationEffects,
]

export const Effect = z.discriminatedUnion(
	'do',
	allBranches as unknown as [(typeof allBranches)[number], ...(typeof allBranches)[number][]],
)

// populate the lazy forward reference used by composite branches.
// must run before any .parse() call — happens at module load time
_registerEffect(Effect as any)

// alias the hand-written Effect type under the same name as the schema const.
// TypeScript merges a value declaration and a type declaration with the same name,
// so `import type { Effect }` gives the union shape, not the Zod schema type
export type Effect = EffectType
