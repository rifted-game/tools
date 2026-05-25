import { pack } from '../internal/pack'
import type { AnimationSet } from '../schema/animation'
import type { SummonTag } from '../schema/enums'
import type { IntentPattern } from '../schema/intent'
import type { Listener } from '../schema/listener'
import type { Text } from '../schema/primitives'
import type { Summon as SummonSchema } from '../schema/summon'
import type { Value } from '../schema/value'

export interface SummonOpts {
	id: string
	/** When omitted resolves to `<namespace>-summon-<name>` from ftl */
	name?: Text
	hp: Value
	maxHp: Value
	tags: SummonTag[]
	intentPattern: IntentPattern
	icon?: string
	sfxAttack?: string
	sfxDeath?: string
	animationSet?: AnimationSet
	passiveListeners?: Listener[]
}

const summonRenames = {
	maxHp: 'max_hp',
	intentPattern: 'intent_pattern',
	sfxAttack: 'sfx_attack',
	sfxDeath: 'sfx_death',
	animationSet: 'animation_set',
	passiveListeners: 'passive_listeners',
}

/** define a summon — an ally or enemy that lives only during combat */
export function Summon(opts: SummonOpts): SummonSchema {
	return pack(
		{
			id: opts.id,
			hp: opts.hp,
			max_hp: opts.maxHp,
			tags: opts.tags,
			intent_pattern: opts.intentPattern,
		},
		{
			name: opts.name,
			icon: opts.icon,
			sfxAttack: opts.sfxAttack,
			sfxDeath: opts.sfxDeath,
			animationSet: opts.animationSet,
			passiveListeners: opts.passiveListeners,
		},
		summonRenames,
	) as unknown as SummonSchema
}
