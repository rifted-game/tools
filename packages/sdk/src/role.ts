import type { CardOpts } from './builders/card'
import type { StateInitInput } from './helpers/state'
import type { PkgBuilder } from './pkg'
import type { Card as CardSchema } from './schema/card'
import type { Affinity, ScaleType } from './schema/enums'

type RoleLockedFields = 'affinity' | 'scaleType'

/** card spec within a role group — role provides affinity and scaleType */
export type CardSpec<
	P extends Record<string, number> = Record<string, number>,
	S extends Record<string, StateInitInput> = Record<string, StateInitInput>,
> = Omit<CardOpts<P, S>, RoleLockedFields>

interface RoleDef {
	affinity: Affinity
	scaleType: ScaleType
	/** when set, overrides the per-card acceptsModifiers */
	acceptsModifiers?: boolean
}

function build<P extends Record<string, number>, S extends Record<string, StateInitInput>>(
	pkg: PkgBuilder,
	def: RoleDef,
	spec: CardSpec<P, S>,
): CardSchema {
	return pkg.Card<P, S>({
		...spec,
		affinity: def.affinity,
		scaleType: def.scaleType,
		...(def.acceptsModifiers !== undefined && { acceptsModifiers: def.acceptsModifiers }),
		// spread Omit<...> + re-add affinity/scaleType structurally = CardOpts<P,S>,
		// but TS won't narrow it itself because of the conditional acceptsModifiers spread
	} as CardOpts<P, S>)
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
		/**
		 * Build a batch of cards that share this role.
		 *
		 * Note: params stay untyped (Record<string, number>) in the batch form —
		 * TypeScript can't infer a distinct P per array element through a single
		 * generic. Use the single-card `Card()` form below when you want typed params.
		 */
		cards(pkg: PkgBuilder, specs: CardSpec[]): CardSchema[] {
			return specs.map(spec => build(pkg, def, spec))
		},
		/** build a single card — P is inferred from the `params` field, so onPlay/render are typed */
		Card<
			P extends Record<string, number> = Record<string, number>,
			const S extends Record<string, StateInitInput> = Record<string, StateInitInput>,
		>(pkg: PkgBuilder, spec: CardSpec<P, S>): CardSchema {
			return build<P, S>(pkg, def, spec)
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
