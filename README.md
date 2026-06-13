# rifted tools

SDK and CLI for building [Rifted](https://github.com/rifted-game/rifted) mods.

A mod is TypeScript: card bodies read like ordinary code, the build product
is data — a **GCF document** (s-expressions as JSON) the engine loads
directly, fluent locale files for every string, and a verified `.rmod`
archive for distribution.

```ts
const pkg = Pkg('ex')
const coins = pkg.playerState('coins')

pkg.card('gambit', {
	name: 'Gambit',
	cooldown: 2, scale: 'hyp', tags: ['attack'],
	params: { base: 5 },
	onPlay({ params }) {
		const roll = rand(1, 6).as('roll')
		when(roll.gt(4).and(coins.spend(2)), () => {
			dmg('weakest_enemy', params.base.scaled().mul(roll))
			addStack(1)
		}).otherwise(() => selfDmg(roll.div(2).ceil()))
	},
})

export default pkg
```

## packages

- [@rifted/sdk](./packages/sdk) — the typed authoring surface: collector-style
  card bodies, content composers, localization, GCF schema, `.rmod` packing
- [@rifted/cli](./packages/cli) — `init`, `build`, `validate`, `pack`,
  `inspect`, `diff`, `typegen`, `locales:scaffold`, `locales:check`

## quick start

```bash
bun add -g @rifted/cli
rifted init my-mod
cd my-mod && bun install
rifted build --watch
rifted pack
```

## development

```bash
bun install
bun run build
bun test
```

The SDK's contract with the engine is enforced by equivalence tests: the
engine's own `examples.gcf.json` and `vanilla.gcf.json` are authored in SDK
style under `packages/sdk/tests/content/` and must build into deep-equal
documents. If the engine's GCF format changes, update the fixtures and the
authored content together.

## contributing

we use [changesets](https://github.com/changesets/changesets) to manage versions
and changelogs. when you make a change that should be released:

1. make your changes on a feature branch
2. run `bun changeset` — pick the affected packages and bump type (patch/minor/major)
3. commit the generated `.changeset/*.md` file along with your changes
4. open a PR

once merged, a "release packages" PR will be opened automatically. merging that
PR publishes the affected packages to npm.

## license

MIT
