# @rifted/cli

Command-line tools for building, validating and packing [Rifted](https://github.com/rifted-game/rifted) mods.

Pairs with [`@rifted/sdk`](https://www.npmjs.com/package/@rifted/sdk) — the SDK
provides the typed authoring API, the CLI handles the build and packaging
pipeline around it.

## Installation

```bash
bun add -g @rifted/cli
```

Requires Node.js 20+ on the user's machine; Bun is recommended.

## Quick start

```bash
rifted init my-mod
cd my-mod
bun install

rifted build      # compile src/index.ts -> dist/gcf.json
rifted validate   # schema + locale checks
rifted pack       # produce dist/my_mod-0.1.0.rmod
```

The `init` command scaffolds a working project with the SDK, an example card,
a starter FTL file and editor configs. Pass `--ide vscode|idea|none` to skip
the interactive prompt.

## Commands

| Command                      | Purpose                                                           |
|------------------------------|-------------------------------------------------------------------|
| `rifted init [name]`         | Scaffold a new mod project                                        |
| `rifted build [entry]`       | Compile mod source into `dist/gcf.json`. `--watch` for dev loop   |
| `rifted validate [file]`     | Validate a built `gcf.json` against the schema, including locales |
| `rifted pack [--out path]`   | Assemble a distributable `.rmod` archive                          |
| `rifted inspect <file.rmod>` | Print the manifest of an existing `.rmod` without unpacking it    |
| `rifted locales:scaffold`    | Generate FTL stubs for every localizable string in the built GCF  |
| `rifted locales:list`        | List every FTL key the engine will look up at runtime             |

Run any command with `--help` for full options.

## Typical workflow

1. `rifted init` to bootstrap the project
2. Edit `src/index.ts` — declare cards, encounters, etc.
3. `rifted build --watch` while iterating
4. `rifted locales:scaffold --lang en` once new entities are added,
   then fill in the `TODO` placeholders in `locales/en.ftl`
5. `rifted pack` produces a `.rmod` file ready to share

## License

MIT
