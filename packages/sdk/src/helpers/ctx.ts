// typed path constants for the eval context.
// most code should use ctx.* shortcuts from helpers/value instead —
// they give ready-made Value expressions without an extra Get() call.
//
// use ctxPath when you need the raw string path itself:
// Get(ctxPath.card.params('base'))  →  { get: 'card.params.base' }
// ctxPath.host.modifiers.stack('vanilla:rage')  →  'host.modifiers.vanilla:rage.stack'
//
// paths are derived from server/internal/engine/eval/resolve.go.

export const ctxPath = {
	card: {
		stack: 'card.stack',
		cooldown: 'card.cooldown',
		baseCooldown: 'card.base_cooldown',
		onCooldown: 'card.on_cooldown',
		modifierCount: 'card.modifier_count',
		params: (key: string) => `card.params.${key}` as const,
		state: (key: string) => `card.state.${key}` as const,
		modifiers: {
			exists: (sourceId: string) => `card.modifiers.${sourceId}.exists` as const,
			stack: (sourceId: string) => `card.modifiers.${sourceId}.stack` as const,
			params: (sourceId: string, param: string) =>
				`card.modifiers.${sourceId}.params.${param}` as const,
		},
	},
	player: {
		hp: 'player.hp',
		maxHp: 'player.max_hp',
		hpPercent: 'player.hp_percent',
		block: 'player.block',
		coins: 'player.coins',
		deckSize: 'player.deck_size',
		deckStacks: 'player.deck_stacks',
		relicsCount: 'player.relics_count',
	},
	// target and enemy are interchangeable — both resolve via SelectedTarget
	target: {
		hp: 'target.hp',
		maxHp: 'target.max_hp',
		hpPercent: 'target.hp_percent',
		block: 'target.block',
		coins: 'target.coins',
		deckSize: 'target.deck_size',
	},
	battle: {
		turn: 'battle.turn',
		enemiesAlive: 'battle.enemies_alive',
		alliesAlive: 'battle.allies_alive',
	},
	run: {
		floor: 'run.floor',
		act: 'run.act',
		state: (key: string) => `run.state.${key}` as const,
	},
	buff: {
		stacks: 'buff.stacks',
		duration: 'buff.duration',
	},
	// inside as_modifier.listener — host is the card this modifier is attached to
	host: {
		stack: 'host.stack',
		cooldown: 'host.cooldown',
		baseCooldown: 'host.base_cooldown',
		onCooldown: 'host.on_cooldown',
		modifierCount: 'host.modifier_count',
		params: (key: string) => `host.params.${key}` as const,
		state: (key: string) => `host.state.${key}` as const,
		modifiers: {
			exists: (sourceId: string) => `host.modifiers.${sourceId}.exists` as const,
			stack: (sourceId: string) => `host.modifiers.${sourceId}.stack` as const,
			params: (sourceId: string, param: string) =>
				`host.modifiers.${sourceId}.params.${param}` as const,
		},
		// owner is the player who has the host card in their deck
		owner: {
			hp: 'host.owner.hp',
			maxHp: 'host.owner.max_hp',
			hpPercent: 'host.owner.hp_percent',
			block: 'host.owner.block',
			coins: 'host.owner.coins',
		},
	},
	// inside as_modifier.listener — modifier is the donor card itself (alias for card.*)
	modifier: {
		stack: 'modifier.stack',
		cooldown: 'modifier.cooldown',
		baseCooldown: 'modifier.base_cooldown',
		onCooldown: 'modifier.on_cooldown',
		params: (key: string) => `modifier.params.${key}` as const,
		state: (key: string) => `modifier.state.${key}` as const,
	},
	// event payload fields (float64 only — string tags like card_id are not accessible via Get)
	event: {
		side: 'event.side', // turn_start / turn_end: 0=player 1=enemy
		turn: 'event.turn', // turn_start
		slot: 'event.slot', // card_drawn / card_returned_from_cooldown
		cooldown: 'event.cooldown', // card_played: cooldown the card enters
		baseDamage: 'event.base_damage', // damage_intent_created
		amount: 'event.amount', // damage_taken / damage_dealt / block_gained / heal
		hpLost: 'event.hp_lost', // damage_taken: damage after block
		blockAbsorbed: 'event.block_absorbed', // damage_taken
		hpPercent: 'event.hp_percent', // damage_taken / player_hp_threshold
		threshold: 'event.threshold', // player_hp_threshold: the threshold value
		stacks: 'event.stacks', // ally_summoned
		delta: 'event.delta', // coins_changed
		option: 'event.option', // choice_made: picked option index
	},
	// inside foreach iterations and let bindings
	let: (name: string) => `let.${name}` as const,
	summoner: {
		card: {
			stack: 'summoner.card.stack',
			params: (key: string) => `summoner.card.params.${key}` as const,
			state: (key: string) => `summoner.card.state.${key}` as const,
		},
		player: {
			hp: 'summoner.player.hp',
			maxHp: 'summoner.player.max_hp',
			hpPercent: 'summoner.player.hp_percent',
		},
	},
} as const
