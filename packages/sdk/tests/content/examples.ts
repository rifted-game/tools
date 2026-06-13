// Authored version of the engine's examples.gcf.json — the equivalence
// contract: this file must build into the exact document stored in the
// engine repo. Inline name/description strings prove they never leak into
// gcf.json (they compile into fluent files instead).

import {
	addBaseDamage,
	addStack,
	block,
	dmg,
	finish,
	intent,
	lit,
	mulDamage,
	on,
	Pkg,
	phase,
	rand,
	selfDmg,
	start,
	summon,
	when,
} from '../../src/index'

export function examplesPkg() {
	const pkg = Pkg('ex', { version: 1, name: 'Examples', semver: '1.0.0' })

	const coins = pkg.playerState('coins')
	const debt = pkg.teamState('debt')
	const loanTaken = pkg.event('loan_taken', { amount: 0 })
	const jackpot = pkg.event('jackpot', { roll: 0 })

	// bare watcher: "while there is debt, it grows every turn"
	const interest = pkg.watcher('interest', {
		on: 'turn_end',
		when: debt.gt(0),
		do() {
			debt.inc(debt.mul(0.1).ceil())
		},
	})

	pkg.card('lender', {
		name: 'Lender',
		description: 'Borrow coins now; the team pays it back with interest.',
		cooldown: 2,
		tags: ['scheme'],
		params: { loan: 6 },
		onPlay({ params }) {
			coins.inc(params.loan)
			debt.inc(params.loan.mul(1.5))
			start(interest)
			loanTaken.emit({ amount: params.loan })
		},
	})

	pkg.card('collector', {
		name: { en: 'Collector', ru: 'Коллектор' },
		cooldown: 3,
		tags: ['attack', 'scheme'],
		onPlay() {
			dmg('selected', debt.min(30))
			debt.set(0)
			finish(interest)
		},
	})

	pkg.card('gambit', {
		cooldown: 2,
		scale: 'hyp',
		tags: ['attack'],
		params: { base: 5 },
		onPlay({ params }) {
			const roll = rand(1, 6).as('roll')
			when(roll.gt(4).and(coins.spend(2)), () => {
				dmg('weakest_enemy', params.base.scaled().mul(roll))
				addStack(1)
				jackpot.emit({ roll })
			}).otherwise(() => {
				selfDmg(roll.div(2).ceil())
			})
		},
	})

	pkg.card('oathblade', {
		cooldown: 1,
		tags: ['attack'],
		params: { base: 7, oath: 15 },
		state: { progress: 0 },
		onPlay({ params, deferCard }) {
			dmg('selected', params.base)
			// the blade leaves the deck; quest: deal 15 total damage — it returns stronger
			deferCard({
				id: 'oath',
				on: 'damage_dealt',
				do({ card, event }) {
					card.state.progress.inc(event.amount)
					when(card.state.progress.gte(card.params.oath), () => {
						addStack(1)
						card.state.progress.set(0)
						finish()
					})
				},
			})
		},
	})

	pkg.modifier('bloodrage', {
		tags: ['attack'],
		duration: 3,
		decay: true,
		hooks: [
			on('damage_intent', { scope: 'subject' }, ({ self, mod }) => {
				addBaseDamage(lit(100).sub(self.hpPercent).mul(0.1).floor().mul(mod.stack))
			}),
		],
	})

	pkg.enemy('warden', {
		hp: 60,
		hooks: [
			on('damage_intent', { scope: 'targeted', when: ({ battle }) => battle.turn.gt(1) }, () => {
				mulDamage(0.75)
			}),
		],
		phases: [
			phase('vigil', {
				until: ({ self }) => self.hpPercent.lt(50),
				steps: [intent.charge(), intent.attack(6)],
			}),
			phase('frenzy', {
				onEnter() {
					block(8)
					summon(12, intent.attack(3))
				},
				steps: [intent.attack(10)],
				hooks: [on('turn_end', { scope: 'subject' }, () => selfDmg(2))],
			}),
		],
	})

	return pkg
}
