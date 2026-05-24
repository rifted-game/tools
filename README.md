# rifted sdk

SDK and CLI for building [Rifted](https://github.com/rifted-game/rifted) mods.

## packages

- [@rifted/sdk](./packages/sdk) — typed builders for cards, encounters, locations
- [@rifted/cli](./packages/cli) — `rifted init`, `rifted build`, `rifted validate`

## quick start

```bash
bun add -g @rifted/cli
rifted init my-mod
cd my-mod
rifted build
```

## development

```bash
bun install
bun run build
bun test
```

## license

MIT
