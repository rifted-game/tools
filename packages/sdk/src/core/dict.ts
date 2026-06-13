// Shared dictionaries mirroring the engine — one source of truth for both
// the authoring statements (./effects, ./hooks) and the document validator
// (./schema/ops). Kept in sync with internal/engine by hand; the equivalence
// tests against the engine fixtures keep them honest.

import type { StateLevel } from './paths'

/** effect target selectors (engine: resolveTarget) */
export type TargetSel =
	| 'self'
	| 'selected'
	| 'event_source'
	| 'event_target'
	| 'all_enemies'
	| 'summoner'
	| 'random_enemy'
	| 'weakest_enemy'
	| 'strongest_enemy'

export const TARGETS: ReadonlySet<TargetSel> = new Set<TargetSel>([
	'self',
	'selected',
	'event_source',
	'event_target',
	'all_enemies',
	'summoner',
	'random_enemy',
	'weakest_enemy',
	'strongest_enemy',
])

/** hook perspectives (engine: HookScope) */
export type HookScope = 'subject' | 'targeted' | 'allied' | 'global'

export const HOOK_SCOPES: readonly HookScope[] = ['subject', 'targeted', 'allied', 'global']

/** state levels for add_state/set_state (engine: stateLevels) */
export const STATE_LEVELS: ReadonlySet<StateLevel> = new Set<StateLevel>([
	'card',
	'card_battle',
	'unit',
	'player',
	'team',
	'match',
])
