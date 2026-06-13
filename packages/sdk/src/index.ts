// @rifted/sdk — the typed authoring surface for Rifted content.
//
// Card bodies are written as code: const + when + statement calls; the SDK
// compiles them into a GCF document (s-expressions) that the engine turns
// into closures. Strings (name/description) compile into fluent files.
//
//   const pkg = Pkg('ex')
//   const coins = pkg.playerState('coins')
//
//   pkg.card('gambit', {
//     name: 'Gambit',
//     cooldown: 2, scale: 'hyp', tags: ['attack'],
//     params: { base: 5 },
//     onPlay({ params }) {
//       const roll = rand(1, 6).as('roll')
//       when(roll.gt(4).and(coins.spend(2)), () => {
//         dmg('weakest_enemy', params.base.scaled().mul(roll))
//         addStack(1)
//       }).otherwise(() => selfDmg(roll.div(2).ceil()))
//     },
//   })
//
//   export default pkg

// the content composer and the package
export { Content, content } from './content'
// events
export { EventHandle } from './core/event-handle'
export type { BuiltinEventName, BuiltinEvents } from './core/events'
// expressions and conditions
export {
	type Cap,
	Cond,
	type CondLike,
	Expr,
	type ExprLike,
	get,
	lit,
	rand,
} from './core/expr'
export type {
	BattlePaths,
	CardPaths,
	ModPaths,
	Params,
	PlayerPaths,
	SelfPaths,
	UnitPaths,
} from './core/paths'
// context paths
export { StateEntry } from './core/paths'
// the package
export type { Ref, RefKind, RefLike } from './core/refs'
// build errors
export { RiftedBuildError } from './core/scope'
// effect statements
export {
	addBaseDamage,
	addStack,
	applyModSelf,
	applyModTarget,
	block,
	chance,
	dmg,
	finish,
	heal,
	mulDamage,
	noop,
	type Otherwise,
	overrideDamage,
	reduceCooldowns,
	replayCard,
	replayLast,
	selfDmg,
	setAffinity,
	shrinkHand,
	start,
	startOn,
	summon,
	type TargetSel,
	when,
} from './effects'
export { f } from './formula'
// hooks, intents, phases
export {
	type EventSpec,
	type HookCtx,
	type HookDef,
	type HookOpts,
	type HookScope,
	on,
} from './hooks'
export {
	type IntentCtx,
	type IntentDef,
	intent,
	type PhaseDef,
	type PhaseSpec,
	phase,
} from './intent'
// localization
export type { LocalesBuild, LocEntry, LocText, MissingString } from './locales/index'
export {
	type ContentModule,
	defineContent,
	Pkg,
	type PkgMeta,
	type PkgOptions,
	PlayerStateHandle,
	RiftedPkg,
} from './pkg'
// definition specs and slot contexts
export type {
	AffinitySpec,
	CardPlayCtx,
	CardRenderCtx,
	CardSpec,
	DeferSpec,
	EncounterSpec,
	EnemySpec,
	KindRuleSpec,
	MapSpec,
	ModifierSpec,
	NodeKindName,
	RevealSpec,
	ScaleType,
	TetherSpec,
	WatcherCtx,
	WatcherSpec,
} from './specs'
