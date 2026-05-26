// public api for @rifted/sdk

// entity builders
export * from './builders/actor'
export * from './builders/animation'
export * from './builders/asset'
export * from './builders/buff'
export * from './builders/card'
export * from './builders/choice'
// escape hatches for expressions not covered by $ fluent API
export { CondFormula } from './builders/condition'
export * from './builders/effect'
export * from './builders/encounter'
export * from './builders/enemy'
export * from './builders/file'
export * from './builders/intent'
export * from './builders/location'
export * from './builders/match-mode'
export * from './builders/modifier'
export * from './builders/modifier-presets'
export * from './builders/phase'
export * from './builders/relic'
export * from './builders/summon'
export * from './builders/text-variants'
export { Formula } from './builders/value'

// high-level helpers ($, Dmg, Block, etc.)
export * from './helpers'

// localization key convention
export * from './locales'
export * from './pkg'
export type { CardSpec, Role } from './role'
export { Berserk, Cursed, defineRole, Neutral, Stacker, Support, Tank } from './role'

// types that don't conflict with builder function names.
// for schema types that DO share a name with a builder function (Card, Buff,
// File, etc.), import from '@rifted/sdk/schema' directly
export type { ActorPosition } from './schema/actor-position'
export type { AnimationSet } from './schema/animation'
export type { Condition } from './schema/condition'
export type { Effect } from './schema/effect'
export type {
	Affinity,
	AssetKind,
	BuffKind,
	BuiltinEvent,
	DamageModifierKind,
	EnemyTag,
	EngineFlag,
	IntentKind,
	ModeTag,
	ModifierTrigger,
	MultiTarget,
	NodeKind,
	Rarity,
	RevealKind,
	ScaleType,
	ScreenKind,
	SummonTag,
	Target,
	TeamKind,
	WinCondition,
} from './schema/enums'
export type { ConditionalIntent, Intent, IntentPattern } from './schema/intent'
export type { Listener } from './schema/listener'
export type { LocaleFile } from './schema/locale'
export type { Text } from './schema/primitives'
export type { StateInit } from './schema/state'
export type { TextWithVariants } from './schema/text-variants'
export type { Value } from './schema/value'
