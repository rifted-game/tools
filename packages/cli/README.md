# @rifted/cli

Command-line tools for building, localizing and packing [Rifted](https://github.com/rifted-game/rifted) mods.

Pairs with [`@rifted/sdk`](https://www.npmjs.com/package/@rifted/sdk) — the SDK
provides the typed authoring API, the CLI handles the build and packaging
pipeline around it.

## Installation

```bash
bun add -g @rifted/cli
```

Requires Node.js 20+; Bun is recommended.

## Quick start

```bash
rifted init my-mod
cd my-mod && bun install
rifted build --watch   # src/index.ts -> dist/gcf.json + dist/locales/*.ftl
rifted pack            # dist/my_mod-0.1.0.rmod
```

## Commands

| command | what it does |
| --- | --- |
| `rifted init [name]` | scaffold a new mod (multi-file entry, content modules, locales/, assets/) |
| `rifted build [entry]` | run the entry through jiti, build the `Pkg`, validate, write `dist/gcf.json` and merged `dist/locales/*.ftl`; `--watch` rebuilds on change |
| `rifted validate [file]` | validate a `gcf.json` against the GCF schema and op tables, with did-you-mean errors |
| `rifted pack [entry]` | build + collect `assets/**` and locales + write a verified `.rmod` (sha256 manifest) |
| `rifted inspect <file>` | summarize a `.rmod` or `gcf.json`: namespace, sections, locales, assets, hash verification |
| `rifted diff <old> [new]` | semantic diff of two documents: added/removed definitions, balance tweaks as leaf changes (`cards/strike params.base: 6 → 8`) |
| `rifted typegen <file>` | generate a typed refs module from another mod's `gcf.json`/`.rmod`: qualified `Ref`s per section, event handles with payload shapes and state handles scraped from its ops |
| `rifted locales:scaffold --lang <l>` | append translator stubs (with context comments) for untranslated strings to `locales/<l>.ftl` |
| `rifted locales:check [--lang <l>]` | translation coverage per locale with itemized gaps; exits 1 when anything is untranslated (CI-friendly) |

The mod entry is plain TypeScript that ends with `export default pkg`. No
bundler required — the CLI executes it directly and serializes the result.

Reusing another mod's content needs only its public build artifact. If the
mod publishes a typed bridge package (see below) just install it; otherwise
generate one locally from its `gcf.json`/`.rmod`:

```bash
rifted typegen path/to/vanilla.gcf.json   # → src/deps/vanilla.ts
```

```ts
import * as vanilla from './deps/vanilla'   // or: from '@rifted/vanilla'

const pkg = Pkg('mymod', { requires: [vanilla] })   // version pulled from the bridge

pkg.card('zealot', {
	affinity: vanilla.affinities.berserk,        // "vanilla:berserk" on the wire
	onPlay() { applyModSelf(vanilla.modifiers.surge) },
})
```

`requires: [vanilla]` reads the floor straight from the bridge, so upgrading
the dependency raises it automatically — the engine refuses to load your mod
without its dependency and checks qualified references at load.

To **publish** a mod's content for others to depend on, emit a bridge package
with `--package` and publish it (e.g. as `@rifted/vanilla`):

```bash
rifted typegen dist/gcf.json --package --name @rifted/vanilla   # → @rifted/vanilla/
```

The package is pure typed metadata — refs, event handles, state handles — with
`@rifted/sdk` as a peer dependency so consumers share one SDK instance.

Localization flow: inline `name`/`description` strings compile into generated
fluent sections; anything in hand-written `locales/*.ftl` wins over them, so
translators can take over any message without touching code.

## License

MIT
