import type { CardOpts } from './builders/card'
import type { PkgBuilder } from './pkg'
import type { Card as CardSchema } from './schema/card'
import type { Affinity, ScaleType } from './schema/enums'

type RoleLockedFields = 'affinity' | 'scaleType'

/** card spec within a role group — role provides affinity and scaleType */
export type CardSpec = Omit<CardOpts, RoleLockedFields>

interface RoleDef {
	affinity: Affinity
	scaleType: ScaleType
	/** when set, overrides the per-card acceptsModifiers */
	acceptsModifiers?: boolean
}

function build(pkg: PkgBuilder, def: RoleDef, spec: CardSpec): CardSchema {
	return pkg.Card({
		...spec,
		affinity: def.affinity,
		scaleType: def.scaleType,
		...(def.acceptsModifiers !== undefined && { acceptsModifiers: def.acceptsModifiers }),
	})
}

/**
 * Create a named role that locks affinity and scaleType across all its cards.
 *
 * ```ts
 * export const berserkCards = Berserk.cards(pkg, [
 *   { id: 'rage', rarity: 'common', baseCooldown: 2, params: { damage: 8 }, onPlay: ... },
 *   { id: 'frenzy', ... },
 * ])
 * ```
 */
export function defineRole(def: RoleDef) {
	return {
		def,
		/** build a batch of cards that share this role */
		cards(pkg: PkgBuilder, specs: CardSpec[]): CardSchema[] {
			return specs.map(spec => build(pkg, def, spec))
		},
		/** build a single card — for legendaries and unique cases */
		Card(pkg: PkgBuilder, spec: CardSpec): CardSchema {
			return build(pkg, def, spec)
		},
	}
}

/** the object returned by defineRole */
export type Role = ReturnType<typeof defineRole>

// predefined roles — affinity + scaleType are locked per role definition
export const Berserk = defineRole({ affinity: 'berserk', scaleType: 'exp' })
export const Stacker = defineRole({ affinity: 'stacker', scaleType: 'linear' })
export const Tank = defineRole({ affinity: 'tank', scaleType: 'hyp' })
export const Support = defineRole({
	affinity: 'support',
	scaleType: 'linear',
	acceptsModifiers: false,
})
export const Cursed = defineRole({ affinity: 'cursed', scaleType: 'flat' })
export const Neutral = defineRole({ affinity: 'neutral', scaleType: 'flat' })
