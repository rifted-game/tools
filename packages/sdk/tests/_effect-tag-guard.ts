// Static drift guard: the hand-written Effect union (schema/effect/base.ts) and
// the runtime zod schema (schema/effect/index.ts) must describe the same set of
// `do` discriminant tags. Add a branch to one but not the other → a compile error
// here (caught by `tsc --noEmit` on the tests project), instead of a silent
// mismatch between what the types claim and what `.parse()` actually accepts.
//
// Why this isn't a tautology: index.ts declares BOTH `const Effect =
// z.discriminatedUnion(...)` (value, inferred from the registered branch schemas)
// and `type Effect = <hand-written base.Effect>` (type). `typeof Effect` resolves
// to the *value* — the discriminated union — so `z.infer<typeof Effect>['do']`
// reads the real branch literals, independently of the hand-written union.
//
// File starts with `_` and is not `*.test.ts`, so bun test ignores it while the
// tests tsconfig still type-checks it.

import type { z } from 'zod'
import type { Effect as EffectSchema } from '../src/schema/effect'
import type { Effect as HandWritten } from '../src/schema/effect/base'

// `do` tags the zod discriminated union actually accepts at parse time
type SchemaTag = z.infer<typeof EffectSchema>['do']
// `do` tags the hand-written union claims
type HandTag = HandWritten['do']

// Compile-time assertion that a type reduces to `never`. If a tag exists on only
// one side, the corresponding Exclude is non-empty, violates the `extends never`
// bound, and `tsc` errors — naming the offending tag in the message.
// Call-position usage keeps the unused-symbol lint satisfied.
function assertNever<_T extends never>(): void {}

// hand union (base.ts) ⊆ schema branches
assertNever<Exclude<HandTag, SchemaTag>>()
// schema branches ⊆ hand union (base.ts)
assertNever<Exclude<SchemaTag, HandTag>>()
