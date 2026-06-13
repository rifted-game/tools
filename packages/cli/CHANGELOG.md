# @rifted/cli

## 1.1.0

### Minor Changes

- Content dependencies: reuse another mod's content through a typed bridge.

  - `PkgOptions.requires` now accepts dependency modules (`ContentDependency[]`) alongside the literal map. `requires: [vanilla]` pulls the version floor from the installed bridge package instead of a hand-written literal, so upgrading the dependency raises the floor automatically.
  - `rifted typegen --package [--name]` emits a publish-ready typed-bridge package (refs, event handles, state handles) with `@rifted/sdk` as a peer dependency — the basis for shipping `@rifted/vanilla` and any mod-as-dependency.

### Patch Changes

- Updated dependencies
  - @rifted/sdk@1.1.0

## 1.0.0

### Major Changes

- Ground-up rewrite for the new GCF engine (s-expressions, hooks, watchers, modifiers). The old builder/listener API is gone.

  **@rifted/sdk**

  - Collector authoring surface: card bodies are plain code (`const` + `when()` + statement calls) compiled into GCF s-expressions at build time. Auto-`let` for `rand()`, `.pin()` snapshots, leak-tracking that fails the build on a `Cond` dropped into a JS `if`.
  - `Expr`/`Cond` with phantom context capabilities, typed `params`/`state`/event payloads, the `f` formula template.
  - Content composers (grammY-style): files declare into local `content()`, refs are plain exports, the entry mounts with `pkg.use()` — mount order is document order. Reference-integrity check catches a forgotten `use()` at build.
  - Localization: `name`/`description` (`string | {locale: text} | {key: alias}`) compile into fluent files with translator auto-comments; hand-written `locales/*.ftl` always wins. Strings never enter `gcf.json`.
  - GCF zod schema + op tables mirroring the engine loader (arity, argument kinds, did-you-mean), JSON Schema 2020-12 emitter, deterministic `.rmod` packing with sha256-hashed assets and locale files.
  - Engine equivalence is enforced by tests: the engine's own `examples.gcf.json` and `vanilla.gcf.json` are authored in SDK style and must build deep-equal.

  **@rifted/cli**

  - `build` (gcf.json + merged `dist/locales/*.ftl`), `validate` (schema + op tables + ref integrity), `pack` (verified `.rmod`), `inspect`.
  - New: `diff` (semantic document diff for balance review), `typegen` (typed refs/events/state bridge to another mod from its public `gcf.json`/`.rmod`), `locales:scaffold` and `locales:check` (translator stubs and CI coverage).
  - `init` scaffolds the canonical multi-file layout (`pkg.ts` / `state.ts` / `content/` composers / composition-root `index.ts`).
  - Removed: the fluent locale commands of the old engine-format toolchain.

### Patch Changes

- Updated dependencies
  - @rifted/sdk@1.0.0

## 0.1.2

### Patch Changes

- fix(sdk): `Role.Card` now infers `P` from `params`, so `onPlay`/`render`/`self.*` are typed per card

  `role.ts`'s `Card`/`cards` methods discarded the card's generic parameters, collapsing `params` to a bare `Record<string, number>` index signature — so `params.dmg` resolved to `Expr` but got no autocomplete and no typo-checking. The single-card `Role.Card` form is now generic and infers `P` (and `S`) from the spec, matching the bare `Card`/`pkg.Card` builders. The batch `Role.cards([...])` form stays untyped by design (TS can't infer a distinct `P` per array element through one generic) — use the single-card form when you want typed params.

- Updated dependencies
  - @rifted/sdk@0.1.2

## 0.1.1

### Patch Changes

- Fix `@rifted/cli` publishing a stale `@rifted/sdk` dependency pin.

  `bun pm pack` reads workspace versions from `bun.lock`, whose workspace blocks
  had gone stale (frozen at an old version), so published CLI tarballs since 0.0.4
  pinned `@rifted/sdk` to an outdated version instead of the matching one. The
  lockfile is regenerated so the internal dep resolves correctly, the release
  script now asserts internal `@rifted/*` deps match the shipped version before
  publishing (failing the release otherwise), and the two packages are marked
  `fixed` in the changeset config so they always version together.

- Updated dependencies
  - @rifted/sdk@0.1.1

## 0.1.0

### Minor Changes

- Syntactic-sugar layer, type-safety hardening, and mod base run-state support.

  **New authoring sugar (all back-compatible):**

  - Nested effect builders (`If`, `Repeat`, `Let`, `Foreach`, `TriggerAfter`, `Choice`, `Listener`, `Intent`) accept `Effect | Effect[]`; single-element arrays no longer wrap in a redundant `sequence`.
  - Callback `Let({ x }, ({ x }) => …)` and callback `Foreach('all_enemies', e => …)` with typed refs (`e.hp`/`e.block`/… read the current target; binding name generated).
  - `Card<P, S>` infers the state shape from `initialState`, so `self.state` / `self.add` / `self.set` are typed without a second generic.
  - `initialState` accepts a bare number (shorthand for `{ const }`) and `randInt(min, max)` (for `{ random_int }`); the full `{ const, decay }` form still works.
  - `Pkg(ns, { state })` gains `key`, `state.set/add/read`, `initialRunState`, and `File` (binds `package.namespace` to the mod namespace).
  - `$.run.state(key)` and new `$.encounter.state(key)` callable readers handle namespaced (`ns:key`) keys; property access kept for bare keys.
  - Intent patterns accept a bare array (`Intent[]` → sequence, `ConditionalIntent[]` → conditional); `intent.attack/defend/charge` singular helpers.
  - `AddBaseDamage` / `MultiplyDamage` / `OverrideScale` named damage-modifier helpers.
  - `revealOn` (with `onTurn` / `onEnemyDeath` / … helpers) implies `hidden_until_revealed`; `charges: { initial, consumeOnPlay }` grouping.
  - `range()` helper; `Location` and `MatchMode` accept plain-object forms (`paths`/`guaranteed`/`tethers`, `teams`/`acts` objects, `win.*`); `sprites()` animation helper.
  - `$.on.custom<E>(event, cb)` accepts a typed payload shape; `Card.render` accepts a callback for typed `params`/`self`.

  **Fixes:**

  - `intents.*` (aggressor/alternating/charger/opportunist) now wire `on_execute` — the engine treats an intent's `amount` as a display-only telegraph, so these enemies previously dealt no damage/block.

  **Type safety:**

  - `Asset` and `Actor` builders use `satisfies z.input<…>` instead of a blind cast.
  - Static drift guard ensures the hand-written `Effect` union and the zod schema stay in sync.

  **Engine support (consumed by the SDK):**

  - New top-level `initial_run_state` mod-file field seeds non-zero `run.state` defaults at run start (built via `pkg.initialRunState(...)` → `File({ initialRunState })`). Unset keys still read as 0.

  `@rifted/cli` is bumped in lockstep to keep both packages on the same version.

### Patch Changes

- Updated dependencies
  - @rifted/sdk@0.1.0

## 0.0.7

### Patch Changes

- Fix types with intents
- Updated dependencies
  - @rifted/sdk@0.0.7

## 0.0.6

### Patch Changes

- Moved to draft 10 json schema
- Updated dependencies
  - @rifted/sdk@0.0.6

## 0.0.5

### Patch Changes

- Fixed Fluent format issues, now `scaffold` can edit hints based on card params
- Updated dependencies
  - @rifted/sdk@0.0.5

## 0.0.4

### Patch Changes

- Fixed bun.lock file
- Updated dependencies
  - @rifted/sdk@0.0.4

## 0.0.3

### Patch Changes

- Fix dependencies
- Updated dependencies
  - @rifted/sdk@0.0.3

## 0.0.2

### Patch Changes

- 0a8e1de: Switch to trusted publishing with provenance
- Updated dependencies [0a8e1de]
  - @rifted/sdk@0.0.2
