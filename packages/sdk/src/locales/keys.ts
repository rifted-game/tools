// Single source of truth for the localization key convention.
// Every entity with id `ns:name` gets the FTL message id `ns-<kind>-name`.
// Sub-fields (name, description, etc.) are Fluent attributes: `ns-card-rage.name`.
// Both the pack-time validator and the runtime resolver must use these helpers
// so the convention only exists in one place.

export type EntityKind =
	| 'card'
	| 'buff'
	| 'relic'
	| 'enemy'
	| 'summon'
	| 'encounter'
	| 'location'
	| 'match_mode'

const SEGMENT: Record<EntityKind, string> = {
	card: 'card',
	buff: 'buff',
	relic: 'relic',
	enemy: 'enemy',
	summon: 'summon',
	encounter: 'encounter',
	location: 'location',
	match_mode: 'mode',
}

function splitId(id: string): { ns: string; name: string } {
	const colon = id.indexOf(':')
	if (colon === -1) return { ns: '', name: id }
	return { ns: id.slice(0, colon), name: id.slice(colon + 1) }
}

function build(kind: EntityKind, ns: string, name: string, attr?: string): string {
	if (!ns) throw new Error(`loc key requires a namespaced id (kind=${kind}, name=${name})`)
	const base = `${ns}-${SEGMENT[kind]}-${name}`
	return attr ? `${base}.${attr}` : base
}

/** generic key builder */
export function locKey(kind: EntityKind, namespacedId: string, attr?: string): string {
	const { ns, name } = splitId(namespacedId)
	return build(kind, ns, name, attr)
}

export type CardAttr = 'name' | 'description' | 'flavor'
export type BuffAttr = 'name' | 'description'
export type RelicAttr = 'name' | 'description' | 'flavor'
export type EnemyAttr = 'name'
export type SummonAttr = 'name'
export type EncounterAttr = 'title' | 'body'
export type LocationAttr = 'name'
export type MatchModeAttr = 'name' | 'description'

export const cardKey = (id: string, attr?: CardAttr) => locKey('card', id, attr)
export const relicKey = (id: string, attr?: RelicAttr) => locKey('relic', id, attr)
export const enemyKey = (id: string, attr?: EnemyAttr) => locKey('enemy', id, attr)
export const summonKey = (id: string, attr?: SummonAttr) => locKey('summon', id, attr)
export const encounterKey = (id: string, attr?: EncounterAttr) => locKey('encounter', id, attr)
export const locationKey = (id: string, attr?: LocationAttr) => locKey('location', id, attr)
export const matchModeKey = (id: string, attr?: MatchModeAttr) => locKey('match_mode', id, attr)

/** buffs use bare ids, so the namespace must be passed separately */
export function buffKey(namespace: string, bareId: string, attr?: BuffAttr): string {
	return build('buff', namespace, bareId, attr)
}
