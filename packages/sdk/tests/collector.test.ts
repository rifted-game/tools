// Collector behavior: auto-let, pin, branching, leak-tracking, errors

import { expect, test } from 'bun:test'
import {
	block,
	dmg,
	f,
	get,
	heal,
	lit,
	Pkg,
	RiftedBuildError,
	rand,
	selfDmg,
	when,
} from '../src/index'

function onPlayOf(build: (pkg: ReturnType<typeof Pkg>) => void): unknown {
	const pkg = Pkg('t')
	build(pkg)
	const doc = pkg.build() as { cards: Array<{ id: string; on_play: unknown }> }
	return doc.cards[0].on_play
}

test('rand: one call = one binding, two references read one roll', () => {
	const onPlay = onPlayOf(pkg =>
		pkg.card('c', {
			onPlay() {
				const r = rand(1, 3)
				block(r)
				heal('self', r)
			},
		}),
	)
	expect(onPlay).toEqual([
		'let',
		{ _v0: ['rand_int', 1, 3] },
		[
			['block', 'let._v0'],
			['heal', 'self', 'let._v0'],
		],
	])
})

test('a binding mid-scope wraps only the tail', () => {
	const onPlay = onPlayOf(pkg =>
		pkg.card('c', {
			params: { base: 3 },
			onPlay({ params }) {
				dmg('selected', params.base)
				const r = rand(1, 3)
				block(r)
			},
		}),
	)
	expect(onPlay).toEqual([
		['damage', 'selected', 'card.params.base'],
		['let', { _v0: ['rand_int', 1, 3] }, ['block', 'let._v0']],
	])
})

test('pin: a snapshot of a changing value', () => {
	const onPlay = onPlayOf(pkg =>
		pkg.card('c', {
			onPlay({ self }) {
				const half = self.hp.div(2).floor().pin('x')
				dmg('selected', half)
				selfDmg(half)
			},
		}),
	)
	expect(onPlay).toEqual([
		'let',
		{ x: ['floor', ['div', 'self.hp', 2]] },
		[
			['damage', 'selected', 'let.x'],
			['self_damage', 'let.x'],
		],
	])
})

test('a binding inside a branch lives only there', () => {
	const onPlay = onPlayOf(pkg =>
		pkg.card('c', {
			onPlay({ battle }) {
				when(battle.turn.gt(1), () => {
					const r = rand(1, 6)
					dmg('selected', r)
				})
			},
		}),
	)
	expect(onPlay).toEqual([
		'if',
		['gt', 'battle.turn', 1],
		['let', { _v0: ['rand_int', 1, 6] }, ['damage', 'selected', 'let._v0']],
	])
})

test('nested when and otherwise', () => {
	const onPlay = onPlayOf(pkg =>
		pkg.card('c', {
			onPlay({ self, battle }) {
				when(battle.turn.gt(1), () => {
					when(self.hp.lt(10), () => block(5)).otherwise(() => dmg('selected', 1))
				}).otherwise(() => selfDmg(1))
			},
		}),
	)
	expect(onPlay).toEqual([
		'if',
		['gt', 'battle.turn', 1],
		['if', ['lt', 'self.hp', 10], ['block', 5], ['damage', 'selected', 1]],
		['self_damage', 1],
	])
})

test('an unused rand fails the build', () => {
	expect(() =>
		onPlayOf(pkg =>
			pkg.card('c', {
				onPlay() {
					rand(1, 6)
					block(1)
				},
			}),
		),
	).toThrow(/never read/)
})

test('an unconsumed Cond fails the build (caught `if (cond)`)', () => {
	expect(() =>
		onPlayOf(pkg =>
			pkg.card('c', {
				onPlay({ self }) {
					// the classic footgun: a JS if over a Cond — the branch
					// would have been collected unconditionally
					if (self.hp.gt(4)) block(1)
				},
			}),
		),
	).toThrow(/never used.*when/)
})

test('an effect outside any scope is a clear error', () => {
	expect(() => block(1)).toThrow(/outside a builder callback/)
})

test('an async onPlay is an error', () => {
	expect(() =>
		onPlayOf(pkg =>
			pkg.card('c', {
				// biome would flag this too, but the runtime guard is tested here
				onPlay: (async () => {}) as unknown as () => void,
			}),
		),
	).toThrow(/synchronous/)
})

test('when with a non-Cond is an error', () => {
	expect(() =>
		onPlayOf(pkg =>
			pkg.card('c', {
				onPlay() {
					when(true as never, () => block(1))
				},
			}),
		),
	).toThrow(/expected a Cond/)
})

test('a duplicate explicit binding name is an error', () => {
	expect(() =>
		onPlayOf(pkg =>
			pkg.card('c', {
				onPlay() {
					const a = rand(1, 2).as('roll')
					const b = rand(1, 2).as('roll')
					block(a.add(b))
				},
			}),
		),
	).toThrow(/duplicate let-binding/)
})

test('the f template builds the same tree as a fluent chain', () => {
	const hp = get('self.hp_percent')
	const stack = get('mod.stack')
	const formula = f`floor((100 - ${hp}) * 0.1) * ${stack}`
	const fluent = lit(100).sub(hp).mul(0.1).floor().mul(stack)
	const pkg = Pkg('t')
	pkg.card('a', { onPlay: () => block(formula) })
	pkg.card('b', { onPlay: () => block(fluent) })
	const doc = pkg.build() as { cards: Array<{ on_play: unknown }> }
	expect(doc.cards[0].on_play).toEqual(doc.cards[1].on_play)
	expect(doc.cards[0].on_play).toEqual([
		'block',
		['mul', ['floor', ['mul', ['sub', 100, 'self.hp_percent'], 0.1]], 'mod.stack'],
	])
})

test('RiftedBuildError is exported and thrown', () => {
	try {
		block(1)
		expect.unreachable()
	} catch (err) {
		expect(err).toBeInstanceOf(RiftedBuildError)
	}
})
