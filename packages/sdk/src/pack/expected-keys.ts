import {
	buffKey,
	cardKey,
	encounterKey,
	enemyKey,
	locationKey,
	matchModeKey,
	relicKey,
	summonKey,
} from '../locales/keys'

export interface ExpectedKeys {
	/** missing in all locale files → pack error */
	required: Map<string, string>
	/** missing in all locale files → warning only */
	optional: Map<string, string>
}

interface GcfLike {
	package?: { namespace?: string }
	cards?: Array<{
		id: string
		name?: unknown
		description?: unknown
		params?: Record<string, number>
	}>
	buffs?: Array<{ id: string; name?: unknown; description?: unknown }>
	relics?: Array<{ id: string; name?: unknown; description?: unknown }>
	enemies?: Array<{ id: string; name?: unknown }>
	summons?: Array<{ id: string; name?: unknown }>
	encounters?: Array<{ id: string; title?: unknown; body?: unknown }>
	locations?: Array<{ id: string; name?: unknown }>
	match_modes?: Array<{ id: string; name?: unknown; description?: unknown }>
}

function provided(v: unknown): boolean {
	return v !== undefined && v !== null
}

/**
 * Returns all FTL keys the engine will look up at runtime for the given gcf.
 * Used by the validator to catch missing translations and by scaffold to generate stubs.
 */
export function expectedKeysFromGcf(gcf: GcfLike): ExpectedKeys {
	const required: Map<string, string> = new Map()
	const optional: Map<string, string> = new Map()
	const ns = gcf.package?.namespace

	for (const card of gcf.cards ?? []) {
		if (!provided(card.name)) required.set(cardKey(card.id, 'name'), `card ${card.id}`)
		if (!provided(card.description))
			required.set(cardKey(card.id, 'description'), `card ${card.id}`)
	}

	for (const buff of gcf.buffs ?? []) {
		if (!ns) continue
		if (!provided(buff.name)) required.set(buffKey(ns, buff.id, 'name'), `buff ${buff.id}`)
		if (!provided(buff.description))
			required.set(buffKey(ns, buff.id, 'description'), `buff ${buff.id}`)
	}

	for (const relic of gcf.relics ?? []) {
		if (!provided(relic.name)) required.set(relicKey(relic.id, 'name'), `relic ${relic.id}`)
		if (!provided(relic.description))
			required.set(relicKey(relic.id, 'description'), `relic ${relic.id}`)
	}

	for (const enemy of gcf.enemies ?? []) {
		if (!provided(enemy.name)) required.set(enemyKey(enemy.id), `enemy ${enemy.id}`)
	}

	for (const summon of gcf.summons ?? []) {
		if (!provided(summon.name)) required.set(summonKey(summon.id), `summon ${summon.id}`)
	}

	for (const enc of gcf.encounters ?? []) {
		// encounter text is decorative; missing keys are warnings, not errors
		if (!provided(enc.title)) optional.set(encounterKey(enc.id, 'title'), `encounter ${enc.id}`)
		if (!provided(enc.body)) optional.set(encounterKey(enc.id, 'body'), `encounter ${enc.id}`)
	}

	for (const loc of gcf.locations ?? []) {
		if (!provided(loc.name)) required.set(locationKey(loc.id), `location ${loc.id}`)
	}

	for (const mm of gcf.match_modes ?? []) {
		if (!provided(mm.name)) required.set(matchModeKey(mm.id, 'name'), `match mode ${mm.id}`)
		if (!provided(mm.description))
			optional.set(matchModeKey(mm.id, 'description'), `match mode ${mm.id}`)
	}

	return { required, optional }
}
