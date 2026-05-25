import type { Effect } from '../../schema/effect'
import type { Value } from '../../schema/value'

/** spawn an enemy onto the field */
export function SummonEnemy(opts: { id: string; count?: Value }): Effect {
	const out: any = { do: 'summon_enemy', id: opts.id }
	if (opts.count !== undefined) out.count = opts.count
	return out
}

/** spawn an allied summon on the player's side. duration of -1 means until end of combat */
export function SummonAlly(opts: { id: string; duration?: Value | number }): Effect {
	const out: any = { do: 'summon_ally', id: opts.id }
	if (opts.duration !== undefined) out.duration = opts.duration
	return out
}
