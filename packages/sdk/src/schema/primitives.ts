import { z } from 'zod'

// namespace:name pattern used for all globally-scoped ids
export const NamespacedId = z
	.string()
	.regex(/^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$/, 'id must be namespace:name format')

// bare snake_case identifier used for buff ids, actor ids, state keys
export const BareId = z.string().regex(/^[a-z][a-z0-9_]*$/, 'must be snake_case')

// 6-digit hex color with leading hash
export const HexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'must be #rrggbb')

// run/encounter state keys must be namespaced to prevent cross-mod collisions
export const NamespacedStateKey = NamespacedId.describe(
	'state key in mod_namespace:key_name format',
)

// dotted context path, e.g. card.params.damage or run.state.mymod:flag
export const ContextPath = z
	.string()
	.regex(/^[a-z_][a-z0-9_]*(\.[a-z_][a-z0-9_:]*)+$/, 'must be a dotted context path')

// localizable text: plain string, language map, or external key reference
export const Text = z.union([
	z.string().min(1),
	z.record(z.string().regex(/^[a-z]{2}(_[A-Z]{2})?$/), z.string().min(1)),
	z.object({ key: z.string().min(1) }).strict(),
])
export type Text = z.infer<typeof Text>
