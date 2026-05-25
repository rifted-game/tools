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
	name: Text
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

/** define a summon. ally or hostile creature that lives during combat only */
export function Summon(opts: SummonOpts): SummonSchema {
	return pack(
		{
			id: opts.id,
			name: opts.name,
			hp: opts.hp,
			max_hp: opts.maxHp,
			tags: opts.tags,
			intent_pattern: opts.intentPattern,
		},
		{
			icon: opts.icon,
			sfxAttack: opts.sfxAttack,
			sfxDeath: opts.sfxDeath,
			animationSet: opts.animationSet,
			passiveListeners: opts.passiveListeners,
		},
		summonRenames,
	) as unknown as SummonSchema
}
