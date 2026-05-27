# @rifted/sdk

Typed builders for [Rifted](https://github.com/rifted-game/rifted) mod content.

This package provides a strongly-typed TypeScript API for declaring cards,
buffs, relics, enemies, encounters, locations and match modes that the Rifted
engine consumes as a single `gcf.json` file.

If you are starting a new mod, use [`@rifted/cli`](https://www.npmjs.com/package/@rifted/cli)
to scaffold a project — it takes care of build, validation and packaging.

## Installation

```bash
bun add @rifted/sdk
```

Works with any Node.js 20+ runtime; Bun is recommended.

## Quick example

```ts
import { File, Pkg, Locale, Berserk, $, Dmg } from '@rifted/sdk'

const pkg = Pkg('my_mod')

export default File({
  package: {
    namespace: 'my_mod',
    version: '0.1.0',
    name: 'My Mod',
    riftedVersion: '>=0.5.0',
  },

  locales: [Locale({ lang: 'en', path: 'locales/en.ftl' })],

  cards: Berserk.cards(pkg, [
    {
      id: 'rage',
      rarity: 'common',
      baseCooldown: 2,
      params: { damage: 8 },
      onPlay: ({ params }) => Dmg(params.damage.scaled()),
    },
  ]),
})
```

Card names, descriptions and other localizable text are looked up by
convention from the FTL files declared in `locales`. For the example above
the engine reads `my_mod-card-rage.name` and `my_mod-card-rage.description`
from `locales/en.ftl`. Card `params` are exposed as Fluent variables, so
`{ $damage }` works out of the box.

## API surface

The default entry point re-exports the high-level builders and helpers most
mods will need: `Card`, `Buff`, `Relic`, `Enemy`, `Summon`, `Encounter`,
`Location`, `MatchMode`, plus the `$` context accessor and shorthand effects
like `Dmg`, `Block`, `Heal`.

Three secondary entry points expose lower-level surfaces:

- `@rifted/sdk/schema` — the raw Zod schemas, useful if you need to
  validate `gcf.json` payloads outside the builder pipeline.
- `@rifted/sdk/pack` — `.rmod` archive helpers and locale validation.
  Mostly used internally by the CLI.
- `@rifted/sdk/locales` — the FTL key convention helpers
  (`cardKey`, `buffKey`, …) shared between SDK and CLI.
- `@rifted/sdk/raw` — un-fluent versions of the DSL primitives (`Get`, `Add`,
  `Lt`, `On`, …). Reach for these when the typed `$` accessor does not
  cover your case.

## Core concepts

A mod is a TypeScript file that calls `File(...)` and exports it as default.
The CLI bundles this file into a `gcf.json` that the engine loads at runtime.

- **Pkg(namespace)** wraps entity builders to auto-prefix ids
  with your mod namespace.
- **Roles** (`Berserk`, `Stacker`, `Tank`, `Support`, `Cursed`, `Neutral`)
  lock the affinity and scaling curve for batches of cards.
- **`$`** is the typed accessor for the runtime evaluation context.
  Use it inside effects and listeners to read params, state and event payload.
- **Effects and listeners** are plain data — the SDK only builds JSON,
  no game logic runs in your code.

## License

MIT
