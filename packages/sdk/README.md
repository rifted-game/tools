# @rifted/sdk

Typed authoring surface for [Rifted](https://github.com/rifted-game/rifted) game content.

A mod is TypeScript. Card bodies read like ordinary code — `const`, `when`,
statement calls — and the SDK compiles them at build time into a **GCF
document** (s-expressions as JSON) the engine loads directly, plus **fluent
locale files** for every string. Nothing from this package runs inside the
game: the build product is data.

If you are starting a new mod, use [`@rifted/cli`](https://www.npmjs.com/package/@rifted/cli)
to scaffold a project — it handles build, validation, localization and
`.rmod` packaging.

## Installation

```bash
bun add @rifted/sdk
```

Works with any Node.js 20+ runtime; Bun is recommended.

## Quick example

```ts
import { addStack, dmg, Pkg, rand, selfDmg, when } from '@rifted/sdk'

const pkg = Pkg('ex', { version: 1, name: 'Examples' })

const coins = pkg.playerState('coins')

pkg.card('gambit', {
	name: 'Gambit',
	description: 'Roll a die. High: spend 2 coins to strike hard.',
	cooldown: 2,
	scale: 'hyp',
	tags: ['attack'],
	params: { base: 5 },
	onPlay({ params }) {
		const roll = rand(1, 6).as('roll') // one call = one dice roll
		when(roll.gt(4).and(coins.spend(2)), () => {
			dmg('weakest_enemy', params.base.scaled().mul(roll))
			addStack(1)
		}).otherwise(() => {
			selfDmg(roll.div(2).ceil())
		})
	},
})

export default pkg
```

`rifted build` turns this into `gcf.json`:

```json
{ "id": "gambit", "cooldown": 2, "scale": "hyp", "tags": ["attack"],
	"params": { "base": 5 },
	"on_play": ["let", { "roll": ["rand_int", 1, 6] },
		["if", ["and", ["gt", "let.roll", 4], ["spend_player_state", "ex:coins", 2]],
			[["damage", "weakest_enemy", ["mul", ["scale", "card.params.base"], "let.roll"]],
			 ["add_card_stack", 1]],
			["self_damage", ["ceil", ["div", "let.roll", 2]]]]] }
```

…and `name`/`description` into `dist/locales/en.ftl` — never into the
document (the engine carries no presentation data).

## The mental model

Three kinds of slots, three writing modes:

| slot                                              | meaning              | you write                              |
|---------------------------------------------------|----------------------|----------------------------------------|
| `onPlay`, hook bodies, `do`, `onEnter`, `execute` | *do something*       | statements: `dmg(...)`, `when(...)`    |
| `when`, `until`, `amount`, `render`               | *compute something*  | an expression: `self.hpPercent.lt(50)` |
| encounters, maps, affinities                      | *describe something* | a plain object                         |

Inside effect bodies an ambient collector records each statement (the same
trick as `describe/it` in test runners). The callback runs **once at build
time**; runtime branching is `when(cond, ...)`, while a plain JS `if` over
ordinary values is build-time branching and stays legal. A `Cond`
accidentally dropped into a JS `if` is caught by leak-tracking and fails
the build.

### Values and snapshots

Expressions are `Expr` values with fluent ops (`add/mul/.../gt/scaled`) or
the `f` template for formula-shaped math:

```ts
addBaseDamage(f`floor((100 - ${self.hpPercent}) * 0.1) * ${mod.stack}`)
```

`rand(lo, hi)` registers a `let`-binding — one call, one roll, references
share the result. `.pin()` snapshots any changing value the same way.

### Splitting a mod across files

Files declare into local `content()` composers — the same builder surface as
the package, detached from it (if you know grammY's `Composer`, this is that
pattern). The entry mounts them with `use()`; references are plain exports:

```ts
// src/content/cards/attack.ts
export const attack = content()
export const strike = attack.card('strike', { ... })   // a ref, import anywhere

// src/content/cards/index.ts — the folder aggregator is itself a composer
export const cards = content()
cards.use(attack, rituals)

// src/content/world.ts
import { strike } from './cards/attack'
export const world = content()
world.encounter('fight', { enemies: [goblin], loot: { pool: [strike], offer: 1, picks: 1 } })

// src/index.ts
const pkg = Pkg('mymod')
pkg.use(cards, world)   // mount order = document order
export default pkg
```

Registration is module-local, so import order never matters. Mounting is
live (grammY semantics): definitions added to a composer after `use()` still
land in the document. A composer belongs to exactly one parent — mounting it
twice fails the build, and a reference whose composer was never mounted is
caught by the build-time integrity check (`reference to unknown card "slash"
— defined in a content() that was never mounted via use()?`).

Pure handles (`pkg.playerState`, `pkg.event`) need the namespace and live on
the package — declare them in a shared module and import them from content
files. For content that needs the package itself there are also
function-style modules: `defineContent(pkg => ...)`, run via `pkg.use(fn)`.

The canonical layout:

```
src/
  pkg.ts            the package identity — nothing else, safe to import anywhere
  state.ts          handles: player/team state, custom events (pure values)
  content/
    core.ts         shared definitions (affinities, seals, watchers) + their refs
    cards/
      attack.ts     a composer per file, refs as plain exports
      rituals.ts
      index.ts      the folder composer: cards.use(attack, rituals)
    world.ts        enemies, encounters, the map
  index.ts          composition root: pkg.use(core, cards, world); export default pkg
```

### Localization

The engine never sees strings: GCF has a strict field whitelist, and the
client derives fluent keys from definition ids (`ex:strike` →
`card-ex-strike` with `.name`/`.description` attributes). The SDK compiles
strings into `.ftl` files; render bindings become fluent variables.

```ts
pkg.card('strike', {
	name: 'Strike',                                  // default locale
	description: 'Deal { $dmg } damage.',            // { $dmg } = render binding
	render: ({ params }) => ({ dmg: params.base.scaled() }),
})

pkg.card('gamble', { name: { en: 'Gamble', ru: 'Авантюра' } })   // per-locale
pkg.modifier('venom', { name: { key: 'shared-venom.name' } })    // fluent alias
```

Generated messages carry translator comments (`# card ex:strike — params:
base=6 — variables: { $dmg }`). Hand-written `locales/*.ftl` files always
win over generated strings; `rifted locales:scaffold --lang ru` appends
stubs for whatever is still untranslated.

### Quests out of card bodies

`deferCard` sends the card away and raises a watcher; `finish()` inside its
body returns it to the deck:

```ts
onPlay({ params, deferCard }) {
	dmg('selected', params.base)
	deferCard({
		id: 'oath',
		name: 'Oath of Blood',
		visible: true,
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
}
```

Everything is typed end to end: `params`/`state` from their declarations,
event payloads from the builtin dictionary or your `pkg.event` shape, and
context capabilities as phantom types — `mod.stack` does not typecheck in a
card render slot, where the engine would silently resolve it to 0.

## Entry points

| import                | contents                                                                                        |
|-----------------------|-------------------------------------------------------------------------------------------------|
| `@rifted/sdk`         | the authoring surface: `Pkg`, `content()`, statements, `on`, `intent`, `phase`, `f`, `rand`    |
| `@rifted/sdk/raw`     | escape hatch: raw `get`/`value`/`cond`/`effect` s-expressions                                   |
| `@rifted/sdk/schema`  | zod schema + op tables of the GCF document, `validateDocument`, JSON Schema 2020-12 emitter     |
| `@rifted/sdk/pack`    | `.rmod` packing: zip with manifest, sha256-hashed assets and locale files                       |
| `@rifted/sdk/locales` | fluent generation: `buildLocales`, `LocText`, scaffold stubs                                    |

## Guarantees

- **Engine equivalence** — the test suite builds the engine's own
  `examples.gcf.json` and `vanilla.gcf.json` from SDK sources and asserts
  deep equality. The emitted format *is* the loader's format.
- **Determinism** — same input, byte-identical `gcf.json` and `.rmod`.
- **Early errors** — unknown ops/targets/events (with did-you-mean), wrong
  arity, leaked conditions, unused bindings, broken fluent syntax and schema
  violations all fail the build pointing at the definition.

## License

MIT
