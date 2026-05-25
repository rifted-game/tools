import type { ActorPosition } from '../../schema/actor-position'
import type { Effect } from '../../schema/effect'
import type { TextWithVariants } from '../../schema/text-variants'

/** play an animation clip on an encounter actor */
export function PlayClip(opts: { actor: string; clip: string; loop?: boolean }): Effect {
	const out: any = { do: 'play_clip', actor: opts.actor, clip: opts.clip }
	if (opts.loop !== undefined) out.loop = opts.loop
	return out
}

/** show a dialogue line attributed to an actor */
export function Say(opts: { actor: string; text: TextWithVariants; perPlayer?: boolean }): Effect {
	const out: any = { do: 'say', actor: opts.actor, text: opts.text }
	if (opts.perPlayer !== undefined) out.per_player = opts.perPlayer
	return out
}

/** pause execution for N seconds */
export function Wait(duration: number): Effect {
	if (duration <= 0 || duration > 30) throw new Error('Wait duration must be in (0, 30]')
	return { do: 'wait', duration }
}

/** block until the player presses continue */
export function WaitForInput(): Effect {
	return { do: 'wait_for_input' }
}

/** open the encounter's choice menu */
export function ShowChoices(): Effect {
	return { do: 'show_choices' }
}

/** play a one-shot sound effect */
export function PlaySfx(opts: { asset: string }): Effect {
	return { do: 'play_sfx', asset: opts.asset }
}

/** move an actor to a new stage position. default animation duration is 0.3s */
export function SetActorPosition(opts: {
	actor: string
	position: ActorPosition
	duration?: number
}): Effect {
	const out: any = {
		do: 'set_actor_position',
		actor: opts.actor,
		position: opts.position,
	}
	if (opts.duration !== undefined) out.duration = opts.duration
	return out
}

/** force close the current encounter and skip remaining outro */
export function CloseEncounter(): Effect {
	return { do: 'close_encounter' }
}
