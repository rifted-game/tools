import {
	AnimationSetGodot,
	AnimationSetSprite,
	AnimClip,
	AnimTriggers,
} from '../src/builders/animation'
import { AnimationSet } from '../src/schema/animation'

describe('AnimClip builder', () => {
	test('basic clip', () => {
		const c = AnimClip({ frames: [0, 1, 2], fps: 12 })
		expect(c.frames).toEqual([0, 1, 2])
		expect(c.fps).toBe(12)
		expect(c.loop).toBeUndefined()
	})

	test('looping clip with next', () => {
		const c = AnimClip({ frames: [0, 1], fps: 8, loop: true, next: 'idle' })
		expect(c.loop).toBe(true)
		expect(c.next).toBe('idle')
	})
})

describe('AnimTriggers builder', () => {
	test('maps camelCase to snake_case', () => {
		const t = AnimTriggers({
			onIdle: 'idle',
			onAttack: 'attack',
			onDeath: 'death',
		})
		expect(t.on_idle).toBe('idle')
		expect(t.on_attack).toBe('attack')
		expect(t.on_death).toBe('death')
		expect(t).not.toHaveProperty('onIdle')
	})
})

describe('AnimationSetSprite builder', () => {
	test('sprite sheet animation validates', () => {
		const anim = AnimationSetSprite({
			spriteSheet: 'assets/chars/goblin.png',
			frameSize: [64, 64],
			clips: { idle: AnimClip({ frames: [0, 1, 2, 3], fps: 6, loop: true }) },
			triggers: AnimTriggers({ onIdle: 'idle' }),
		})
		expect(() => AnimationSet.parse(anim)).not.toThrow()
		expect(anim.kind).toBe('sprite_sheet')
		expect(anim.sprite_sheet).toBe('assets/chars/goblin.png')
		expect(anim.frame_size).toEqual([64, 64])
	})

	test('invalid sprite path throws', () => {
		const anim = AnimationSetSprite({
			spriteSheet: 'bad/path.png',
			frameSize: [64, 64],
			clips: { idle: AnimClip({ frames: [0], fps: 6 }) },
			triggers: AnimTriggers({}),
		})
		expect(() => AnimationSet.parse(anim)).toThrow()
	})
})

describe('AnimationSetGodot builder', () => {
	test('godot resource validates', () => {
		const anim = AnimationSetGodot({
			resource: 'assets://chars/player.tres',
			triggers: AnimTriggers({ onIdle: 'idle', onDeath: 'death' }),
		})
		expect(() => AnimationSet.parse(anim)).not.toThrow()
		expect(anim.kind).toBe('godot_resource')
	})

	test('invalid core path throws', () => {
		const anim = AnimationSetGodot({
			resource: 'assets/chars/player.tres',
			triggers: AnimTriggers({}),
		})
		expect(() => AnimationSet.parse(anim)).toThrow()
	})
})
