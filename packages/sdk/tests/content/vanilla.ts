// Authored version of the engine's vanilla.gcf.json — the second equivalence
// contract: affinities, render bindings, art, a craft seal, encounters and a
// map definition

import { block, dmg, intent, on, Pkg, phase, replayCard } from '../../src/index'

export function vanillaPkg() {
	const pkg = Pkg('vanilla', { version: 1, name: 'Vanilla', semver: '1.0.0', authors: ['rifted'] })

	const berserk = pkg.affinity('berserk', {
		art: { icon: 'assets/affinity/berserk.png', color: '#c0392b' },
	})
	const weaver = pkg.affinity('weaver', {
		art: { icon: 'assets/affinity/weaver.png', color: '#2980b9' },
	})

	const attackCard = (id: string, base: number, art?: Record<string, string>) =>
		pkg.card(id, {
			cooldown: 1,
			scale: 'flat',
			tags: ['attack'],
			affinity: berserk,
			params: { base },
			render: ({ params }) => ({ dmg: params.base.scaled() }),
			...(art ? { art } : {}),
			onPlay({ params }) {
				dmg('selected', params.base)
			},
		})

	const blockCard = (id: string, base: number) =>
		pkg.card(id, {
			cooldown: 1,
			scale: 'flat',
			affinity: weaver,
			params: { base },
			render: ({ params }) => ({ block: params.base.scaled() }),
			onPlay({ params }) {
				block(params.base)
			},
		})

	attackCard('strike', 6, {
		icon: 'assets/cards/strike.png',
		sound: 'assets/sfx/slash.ogg',
		glow: '#c0392b',
	})
	const jab = attackCard('jab', 4)
	const bash = attackCard('bash', 9)
	blockCard('guard', 5)
	const ward = blockCard('ward', 8)

	// echo seal: replays its carrier card per stack
	const surge = pkg.modifier('surge', {
		render: ({ mod }) => ({ echoes: mod.stack }),
		hooks: [on('card_played', ({ mod }) => replayCard(mod.stack))],
	})

	// craft: sacrifice the card to seal surge onto another one
	pkg.card('emberseal', {
		cooldown: 1,
		seal: surge,
		affinity: weaver,
		art: { icon: 'assets/cards/emberseal.png' },
		onPlay() {
			block(0)
		},
	})

	const goblin = pkg.enemy('goblin', {
		hp: 16,
		phases: [phase({ steps: [intent.attack(4)] })],
	})
	const slime = pkg.enemy('slime', {
		hp: 12,
		phases: [phase({ steps: [intent.attack(3)] })],
	})
	const brute = pkg.enemy('brute', {
		hp: 36,
		art: {
			sprite: 'assets/mobs/brute.png',
			anim_attack: 'brute_smash',
			sound_hit: 'assets/sfx/smash.ogg',
		},
		phases: [
			phase('wind-up', {
				until: ({ self }) => self.hpPercent.lt(40),
				steps: [intent.charge(), intent.attack(7)],
			}),
			phase('rage', {
				onEnter() {
					block(6)
				},
				steps: [intent.attack(9)],
			}),
		],
	})

	const loot = { pool: [bash, ward, jab], offer: 3, picks: 1 }
	const goblinFight = pkg.encounter('goblin', { enemies: [goblin], loot })
	const slimeFight = pkg.encounter('slime', { enemies: [slime], loot })
	const bruteFight = pkg.encounter('brute', {
		enemies: [brute],
		loot: { ...loot, picks: 2 },
	})

	pkg.map('act1', {
		floors: 6,
		width: 5,
		paths: 6,
		fanout: 3,
		rules: {
			combat: { weight: 60 },
			shop: { weight: 10, minFloor: 2, noAdjacent: true },
			rest: { weight: 8, minFloor: 2, noAdjacent: true },
			elite: { weight: 14, minFloor: 2, noAdjacent: true },
		},
		forceFloors: { [-1]: 'rest' },
		content: {
			combat: [goblinFight, slimeFight],
			elite: [bruteFight],
		},
		tethers: {
			pairwise: { chance: 0.9, min: 1, minFloor: 2 },
			anchor: 'boss',
		},
	})

	return pkg
}
