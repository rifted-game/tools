import { describe, expect, test } from 'bun:test'

import '../src/schema/effect'

import { ApplyBuff, Damage, GainBlock, SelfDamage } from '../src/builders/effect/battle'
import { Foreach, If, Let, Random, Repeat, Sequence } from '../src/builders/effect/composite'
import { AddCoins, HealEffect } from '../src/builders/effect/run'
import { Get } from '../src/builders/value'
import { Block, Dmg } from '../src/helpers'
import { ctx, Param, Scaled } from '../src/helpers/value'
import { Effect as EffectSchema } from '../src/schema/effect'

// value DSL uses key-based shape: { get: 'path' } not { op: 'get', path }
// condition DSL uses key-based shape: { lt: [v1, v2] } not { op: 'lt', ... }

describe('battle effects', () => {
	test('Damage round-trips through schema', () => {
		const e = Damage({ target: 'selected_enemy', amount: Param('base') })
		const r = EffectSchema.parse(e)
		expect(r).toMatchObject({ do: 'damage', target: 'selected_enemy' })
	})

	test('GainBlock without target passes schema', () => {
		const e = GainBlock({ amount: { get: 'card.params.base' } })
		const r = EffectSchema.parse(e)
		expect(r).toMatchObject({ do: 'gain_block' })
	})

	test('SelfDamage', () => {
		const e = SelfDamage({ get: 'card.params.dmg' })
		const r = EffectSchema.parse(e)
		expect(r).toMatchObject({ do: 'self_damage' })
	})

	test('ApplyBuff', () => {
		const e = ApplyBuff({
			buff: 'burning',
			stacks: Param('stacks'),
			target: 'selected_enemy',
			duration: -1,
		})
		const r = EffectSchema.parse(e)
		expect(r).toMatchObject({ do: 'apply_buff', buff: 'burning' })
	})
})

describe('helpers', () => {
	test('Dmg shorthand defaults to selected_enemy', () => {
		const e = Dmg(Param('base'))
		expect(e).toMatchObject({ do: 'damage', target: 'selected_enemy' })
	})

	test('Dmg with explicit target', () => {
		const e = Dmg(Param('base'), 'all_enemies')
		expect(e).toMatchObject({ do: 'damage', target: 'all_enemies' })
	})

	test('Block shorthand', () => {
		const e = Block(Param('block'))
		expect(e).toMatchObject({ do: 'gain_block' })
	})

	test('Scaled produces scale expression', () => {
		const v = Scaled('base')
		// Scaled = Scale(Get('card.params.base')) = { scale: { get: 'card.params.base' } }
		expect(v).toMatchObject({ scale: { get: 'card.params.base' } })
	})

	test('ctx paths use key-based shape', () => {
		expect(ctx.playerHp).toEqual({ get: 'player.hp' })
		expect(ctx.battleTurn).toEqual({ get: 'battle.turn' })
		expect(ctx.playerBlock).toEqual({ get: 'player.block' })
	})

	test('Param shorthand', () => {
		expect(Param('x')).toEqual({ get: 'card.params.x' })
	})
})

describe('composite effects', () => {
	test('Sequence of effects', () => {
		const e = Sequence([Dmg(Param('base')), Block(Param('block'))])
		const r = EffectSchema.parse(e)
		expect(r).toMatchObject({ do: 'sequence' })
	})

	test('Repeat wraps an effect', () => {
		const e = Repeat({
			count: { get: 'card.params.n' },
			effect: Dmg(Param('base')),
		})
		const r = EffectSchema.parse(e)
		expect(r).toMatchObject({ do: 'repeat' })
	})

	test('If with then only', () => {
		const e = If({
			condition: { lt: [ctx.playerHp, { get: 'card.params.threshold' }] },
			then: HealEffect({ amount: Param('base') }),
		})
		const r = EffectSchema.parse(e)
		expect(r).toMatchObject({ do: 'if' })
	})

	test('If with then and else', () => {
		const e = If({
			condition: { lt: [ctx.playerHp, { get: 'card.params.threshold' }] },
			then: HealEffect({ amount: Param('base') }),
			else: Dmg(Param('base')),
		})
		const r = EffectSchema.parse(e)
		expect(r).toMatchObject({ do: 'if' })
	})

	test('Let binding', () => {
		const e = Let({ bindings: { x: Param('base') }, in: Dmg(Get('let.x')) })
		const r = EffectSchema.parse(e)
		expect(r).toMatchObject({ do: 'let' })
	})

	test('Foreach loops over a target group', () => {
		const e = Foreach({
			targets: 'all_enemies',
			as: 'target',
			effect: AddCoins({ amount: { get: 'card.params.coins' } }),
		})
		const r = EffectSchema.parse(e)
		expect(r).toMatchObject({ do: 'foreach' })
	})

	test('Random picks from options', () => {
		const e = Random([Dmg(Param('base')), Block(Param('block'))])
		const r = EffectSchema.parse(e)
		expect(r).toMatchObject({ do: 'random' })
	})
})

describe('deeply nested effects', () => {
	test('Sequence inside Repeat inside If', () => {
		const e = If({
			condition: { lt: [ctx.battleTurn, { get: 'card.params.limit' }] },
			then: Repeat({
				count: { get: 'card.params.n' },
				effect: Sequence([Dmg(Param('base')), Block(Param('block'))]),
			}),
		})
		expect(() => EffectSchema.parse(e)).not.toThrow()
	})
})
