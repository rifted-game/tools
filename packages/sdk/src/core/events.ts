// Dictionary of builtin engine events and their payloads. Kept in sync with
// internal/engine/event.go by hand; keys here are camelCase, on the wire they
// travel snake_case (event.hp_lost)

export interface BuiltinEvents {
	/** before damage lands: modifiers write adjustments into the payload */
	damage_intent: { base: number; add: number; mul: number; override: number }
	/** damage dealt (attacker's perspective) */
	damage_dealt: { amount: number; hpLost: number; blockAbsorbed: number }
	/** damage taken (target's perspective) */
	damage_taken: { amount: number; hpLost: number; blockAbsorbed: number }
	block_gained: { amount: number }
	healed: { amount: number }
	card_played: Record<never, number>
	unit_died: Record<never, number>
	turn_start: { side: number }
	turn_end: { side: number }
	battle_start: Record<never, number>
	battle_end: Record<never, number>
}

export type BuiltinEventName = keyof BuiltinEvents

export const BUILTIN_EVENTS: readonly BuiltinEventName[] = [
	'damage_intent',
	'damage_dealt',
	'damage_taken',
	'block_gained',
	'healed',
	'card_played',
	'unit_died',
	'turn_start',
	'turn_end',
	'battle_start',
	'battle_end',
]

export function isBuiltinEvent(kind: string): kind is BuiltinEventName {
	return (BUILTIN_EVENTS as readonly string[]).includes(kind)
}

/** camelCase TS properties → snake_case engine payload keys */
export function snakeKey(prop: string): string {
	return prop.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`)
}
