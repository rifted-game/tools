# rifted tools

SDK and CLI for building [Rifted](https://github.com/rifted-game/rifted) mods.

## packages

- [@rifted/sdk](./packages/sdk) — typed builders for cards, encounters, locations
- [@rifted/cli](./packages/cli) — `rifted init`, `rifted build`, `rifted validate`

## quick start

\`\`\`bash
bun add -g @rifted/cli
rifted init my-mod
cd my-mod
rifted build
\`\`\`

## development

\`\`\`bash
bun install
bun run build
bun test
\`\`\`

## contributing

we use [changesets](https://github.com/changesets/changesets) to manage versions
and changelogs. when you make a change that should be released:

1. make your changes on a feature branch
2. run \`bun changeset\` — pick the affected packages and bump type (patch/minor/major)
3. commit the generated \`.changeset/*.md\` file along with your changes
4. open a PR

once merged, a "release packages" PR will be opened automatically. merging that
PR publishes the affected packages to npm.

## license

MIT
