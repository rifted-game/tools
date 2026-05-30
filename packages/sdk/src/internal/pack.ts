// merges required and optional fields into a snake_case output object.
// optional keys with undefined values are skipped. the renames map
// translates camelCase input keys to their snake_case schema counterparts.
//
// NOTE: every builder casts this result `as unknown as <Schema>`, so the precise
// return type below is discarded at the call site — it's internal-signature
// hygiene (no more `Record<string, unknown>` hole), not call-site type safety.
export type RenameMap = Record<string, string>

// drop keys whose value is exactly undefined, and make keys that *may* be
// undefined optional rather than `T | undefined` required.
type StripUndefined<T> = {
	[K in keyof T as undefined extends T[K] ? never : K]: T[K]
} & {
	[K in keyof T as undefined extends T[K] ? K : never]?: Exclude<T[K], undefined>
}

// rewrite keys present in the rename map to their snake_case counterpart.
// needs the rename map passed `as const` so R carries the literal target keys.
type ApplyRenames<T, R extends Readonly<RenameMap>> = {
	[K in keyof T as K extends keyof R ? R[K] : K]: T[K]
}

export function pack<
	Req extends Record<string, unknown>,
	Opt extends Record<string, unknown>,
	const R extends Readonly<RenameMap> = Record<never, never>,
>(required: Req, optional: Opt, renames: R = {} as R): Req & ApplyRenames<StripUndefined<Opt>, R> {
	const out: Record<string, unknown> = { ...required }
	// index R through the loose view; its precise literal type only matters to callers
	const map = renames as RenameMap
	for (const [key, value] of Object.entries(optional)) {
		if (value === undefined) continue
		out[map[key] ?? key] = value
	}
	return out as Req & ApplyRenames<StripUndefined<Opt>, R>
}
