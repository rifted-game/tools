import { pack } from '../internal/pack'
import type { AnimationSet } from '../schema/animation'
import type { Enemy as EnemySchema } from '../schema/enemy'
import type { EnemyTag } from '../schema/enums'
import type { IntentPattern } from '../schema/intent'
import type { Listener } from '../schema/listener'
import type { Phase } from '../schema/phase'
import type { Text } from '../schema/primitives'
import type { Value } from '../schema/value'

interface EnemyBase {
	id: string
	/** When omitted resolves to `<namespace>-enemy-<name>` from ftl */
	name?: Text
	hp: Value
	maxHp: Value
	tags: EnemyTag[]
	icon?: string
	sfxAttack?: string
	sfxDeath?: string
	animationSet?: AnimationSet
	passiveListeners?: Listener[]
}

interface EnemyFlat extends EnemyBase {
	intentPattern: IntentPattern
	phases?: never
}
interface EnemyPhased extends EnemyBase {
	phases: Phase[]
	intentPattern?: never
}

// compile-time enforcement of "exactly one of intentPattern / phases"
export type EnemyOpts = EnemyFlat | EnemyPhased

const enemyRenames = {
	maxHp: 'max_hp',
	sfxAttack: 'sfx_attack',
	sfxDeath: 'sfx_death',
	animationSet: 'animation_set',
	intentPattern: 'intent_pattern',
	passiveListeners: 'passive_listeners',
}

/** define an enemy. use `intentPattern` for normal enemies, `phases` for bosses */
export function Enemy(opts: EnemyOpts): EnemySchema {
	return pack(
		{ id: opts.id, hp: opts.hp, max_hp: opts.maxHp, tags: opts.tags },
		{
			name: opts.name,
			icon: opts.icon,
			sfxAttack: opts.sfxAttack,
			sfxDeath: opts.sfxDeath,
			animationSet: opts.animationSet,
			intentPattern: 'intentPattern' in opts ? opts.intentPattern : undefined,
			phases: 'phases' in opts ? opts.phases : undefined,
			passiveListeners: opts.passiveListeners,
		},
		enemyRenames,
	) as unknown as EnemySchema
}
