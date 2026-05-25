import type { Effect } from '../../schema/effect'
import type { Affinity, Rarity, ScreenKind } from '../../schema/enums'
import type { Text } from '../../schema/primitives'
import type { Value } from '../../schema/value'

/** open a card-offer screen with cards drawn from a filtered pool */
export function OfferCardFromPool(
	opts: {
		rarity?: Rarity
		affinity?: Affinity
		count?: number
		pickMax?: number
		cost?: Value
		skipAllowed?: boolean
	} = {},
): Effect {
	const out: any = { do: 'offer_card_from_pool' }
	if (opts.rarity !== undefined) out.rarity = opts.rarity
	if (opts.affinity !== undefined) out.affinity = opts.affinity
	if (opts.count !== undefined) out.count = opts.count
	if (opts.pickMax !== undefined) out.pick_max = opts.pickMax
	if (opts.cost !== undefined) out.cost = opts.cost
	if (opts.skipAllowed !== undefined) out.skip_allowed = opts.skipAllowed
	return out
}

/** offer a relic. without id, pulls from the location's pool */
export function OfferRelic(opts: { id?: string; rarity?: Rarity; cost?: Value } = {}): Effect {
	const out: any = { do: 'offer_relic' }
	if (opts.id !== undefined) out.id = opts.id
	if (opts.rarity !== undefined) out.rarity = opts.rarity
	if (opts.cost !== undefined) out.cost = opts.cost
	return out
}

/** open an encounter screen */
export function OpenEncounter(opts: { id: string }): Effect {
	return { do: 'open_encounter', id: opts.id }
}

/** push a sub-screen onto the encounter. execution pauses until the screen closes */
export function ShowScreen(opts: {
	kind: ScreenKind
	title?: Text
	body?: Text
	config?: Record<string, unknown>
}): Effect {
	const screen: any = { kind: opts.kind }
	if (opts.title !== undefined) screen.title = opts.title
	if (opts.body !== undefined) screen.body = opts.body
	if (opts.config !== undefined) screen.config = opts.config
	return { do: 'show_screen', screen }
}
