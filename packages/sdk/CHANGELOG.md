# @rifted/sdk

## 0.1.2

### Patch Changes

- fix(sdk): `Role.Card` now infers `P` from `params`, so `onPlay`/`render`/`self.*` are typed per card

  `role.ts`'s `Card`/`cards` methods discarded the card's generic parameters, collapsing `params` to a bare `Record<string, number>` index signature — so `params.dmg` resolved to `Expr` but got no autocomplete and no typo-checking. The single-card `Role.Card` form is now generic and infers `P` (and `S`) from the spec, matching the bare `Card`/`pkg.Card` builders. The batch `Role.cards([...])` form stays untyped by design (TS can't infer a distinct `P` per array element through one generic) — use the single-card form when you want typed params.

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

## 0.0.7

### Patch Changes

- Fix types with intents

## 0.0.6

### Patch Changes

- Moved to draft 10 json schema

## 0.0.5

### Patch Changes

- Fixed Fluent format issues, now `scaffold` can edit hints based on card params

## 0.0.4

### Patch Changes

- Fixed bun.lock file

## 0.0.3

### Patch Changes

- Fix dependencies

## 0.0.2

### Patch Changes

- 0a8e1de: Switch to trusted publishing with provenance
