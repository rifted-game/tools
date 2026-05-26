import { Get, Scale } from '../builders/value'
import type { Value } from '../schema/value'

/** read a card param by name. shorthand for Get('card.params.<name>') */
export function Param(name: string): Value {
	return Get(`card.params.${name}`)
}

/** read a card state field */
export function State(key: string): Value {
	return Get(`card.state.${key}`)
}

/** read a run-wide state field. key must include the namespace prefix */
export function RunState(key: string): Value {
	return Get(`run.state.${key}`)
}

/** read an encounter-local state field */
export function EncState(key: string): Value {
	return Get(`encounter.state.${key}`)
}

/** scale a card param by the active scale_type. the most common pattern in card definitions */
export function Scaled(param: string): Value {
	return Scale(Get(`card.params.${param}`))
}

// ready-made value expressions for the most common context paths.
// for the full typed path list use ctxPath from './ctx'.
export const ctx = {
	cardStack: Get('card.stack'),
	cardCooldown: Get('card.cooldown'),
	playerHp: Get('player.hp'),
	playerHpPercent: Get('player.hp_percent'),
	playerBlock: Get('player.block'),
	playerCoins: Get('player.coins'),
	playerDeckSize: Get('player.deck_size'),
	targetHp: Get('target.hp'),
	targetHpPercent: Get('target.hp_percent'),
	enemiesAlive: Get('battle.enemies_alive'),
	battleTurn: Get('battle.turn'),
	runFloor: Get('run.floor'),
	runAct: Get('run.act'),
	hostStack: Get('host.stack'),
	modifierStack: Get('modifier.stack'),
} as const

// shorthand aliases for the most frequently used modifier/host values
export const modStack = ctx.modifierStack
export const hostStack = ctx.hostStack
