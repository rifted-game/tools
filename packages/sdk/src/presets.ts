import type { CardOpts } from './builders/card'
import { AsModifier } from './builders/modifier'

// presets are partial CardOpts spread into the full opts:
//   Card({ ...presets.berserk, ...presets.common, id: 'rage', ... })
// satisfies Partial<CardOpts> ensures compile-time correctness

const stacker = {
	affinity: 'stacker',
	scaleType: 'linear',
} satisfies Partial<CardOpts>
const berserk = {
	affinity: 'berserk',
	scaleType: 'exp',
} satisfies Partial<CardOpts>
const tank = { affinity: 'tank', scaleType: 'hyp' } satisfies Partial<CardOpts>
const support = {
	affinity: 'support',
	scaleType: 'linear',
	acceptsModifiers: false,
} satisfies Partial<CardOpts>
const cursed = {
	affinity: 'cursed',
	scaleType: 'flat',
} satisfies Partial<CardOpts>
const neutral = {
	affinity: 'neutral',
	scaleType: 'flat',
} satisfies Partial<CardOpts>
const common = { rarity: 'common' } satisfies Partial<CardOpts>
const rare = { rarity: 'rare' } satisfies Partial<CardOpts>
const legendary = { rarity: 'legendary' } satisfies Partial<CardOpts>

/** donor preset — pairs with an as_modifier block */
function donor(asMod: Parameters<typeof AsModifier>[0]): Partial<CardOpts> {
	return {
		isModifierDonor: true,
		acceptsModifiers: false,
		asModifier: AsModifier(asMod),
	}
}

export const presets = {
	stacker,
	berserk,
	tank,
	support,
	cursed,
	neutral,
	common,
	rare,
	legendary,
	donor,
}
