import { z } from 'zod'

export const Affinity = z.enum(['neutral', 'stacker', 'berserk', 'tank', 'support', 'cursed'])
export type Affinity = z.infer<typeof Affinity>

export const Rarity = z.enum(['common', 'rare', 'legendary'])
export type Rarity = z.infer<typeof Rarity>

export const ScaleType = z.enum(['linear', 'exp', 'hyp', 'flat'])
export type ScaleType = z.infer<typeof ScaleType>

export const BuffKind = z.enum(['buff', 'debuff', 'neutral'])
export type BuffKind = z.infer<typeof BuffKind>

export const IntentKind = z.enum([
	'attack',
	'defend',
	'charging',
	'curse',
	'summon',
	'buff',
	'unknown',
])
export type IntentKind = z.infer<typeof IntentKind>

export const DamageModifierKind = z.enum(['add_to_base', 'multiply_final', 'override_scale'])
export type DamageModifierKind = z.infer<typeof DamageModifierKind>

export const EnemyTag = z.enum(['aggressive', 'passive', 'random', 'boss', 'elite', 'summon'])
export type EnemyTag = z.infer<typeof EnemyTag>

export const SummonTag = z.enum(['summon', 'friendly', 'aggressive', 'passive'])
export type SummonTag = z.infer<typeof SummonTag>

export const EngineFlag = z.enum([
	'block_card_play',
	'block_lethal_damage',
	'lock_agro',
	'invisible',
])
export type EngineFlag = z.infer<typeof EngineFlag>

export const ModeTag = z.enum(['pve', 'pvp'])
export type ModeTag = z.infer<typeof ModeTag>

export const Target = z.enum([
	'self',
	'selected_enemy',
	'random_enemy',
	'all_enemies',
	'selected_ally',
	'all_allies',
	'selected_ally_card',
	'selected_ally_card_on_cooldown',
	'selected_own_card',
	'selected_ally_summon',
	'random_ally_summon',
	'all_ally_summons',
	'lowest_hp_ally',
	'selected_player',
	'all_players',
	'last_summoned_ally',
	'host_card',
	'host_owner',
])
export type Target = z.infer<typeof Target>

export const MultiTarget = z.enum(['all_enemies', 'all_allies', 'all_ally_summons', 'all_players'])
export type MultiTarget = z.infer<typeof MultiTarget>

export const ScreenKind = z.enum([
	'prompt',
	'card_offer',
	'card_remove',
	'deck_view',
	'gamble',
	'swap_table',
	'rest',
])
export type ScreenKind = z.infer<typeof ScreenKind>

export const AssetKind = z.enum([
	'card_art',
	'card_frame',
	'buff_icon',
	'relic_icon',
	'background',
	'node_icon',
	'actor_portrait',
	'sprite_sheet',
	'sfx',
	'music',
	'ambient',
])
export type AssetKind = z.infer<typeof AssetKind>

export const TeamKind = z.enum(['human', 'ai'])
export type TeamKind = z.infer<typeof TeamKind>

export const WinCondition = z.enum([
	'all_acts_completed',
	'last_team_standing',
	'first_to_objective',
	'highest_score',
	'survive_n_turns',
])
export type WinCondition = z.infer<typeof WinCondition>

export const NodeKind = z.enum([
	'combat',
	'elite',
	'shop',
	'altar',
	'anomaly',
	'swap_zone',
	'encounter',
	'boss',
	'pvp',
])
export type NodeKind = z.infer<typeof NodeKind>

export const ModifierTrigger = z.enum([
	'host_played',
	'host_damage_intent',
	'host_drawn',
	'host_cooldown_start',
	'host_returned_from_cooldown',
	'turn_start',
	'turn_end',
	'permanent',
])
export type ModifierTrigger = z.infer<typeof ModifierTrigger>

export const RevealKind = z.enum([
	'damage_taken',
	'turn_n',
	'enemy_died',
	'block_broken',
	'ally_buffed',
])
export type RevealKind = z.infer<typeof RevealKind>

export const BuiltinEvent = z.enum([
	'turn_start',
	'turn_end',
	'card_played',
	'card_drawn',
	'card_returned_from_cooldown',
	'damage_intent_created',
	'damage_dealt',
	'damage_taken',
	'block_gained',
	'enemy_died',
	'entity_died',
	'player_hp_threshold',
	'card_acquired_curse_bound',
	'ally_summoned',
	'card_modifier_applied',
	'card_modifier_removed',
	'encounter_opened',
	'encounter_closed',
	'choice_made',
	'player_hp_changed',
	'coins_changed',
	'run_state_changed',
])
export type BuiltinEvent = z.infer<typeof BuiltinEvent>
