// merges required and optional fields into a snake_case output object.
// optional keys with undefined values are skipped. the renames map
// translates camelCase input keys to their snake_case schema counterparts
export type RenameMap = Record<string, string>

export function pack(
	required: Record<string, unknown>,
	optional: Record<string, unknown>,
	renames: RenameMap = {},
): Record<string, unknown> {
	const out: Record<string, unknown> = { ...required }
	for (const [key, value] of Object.entries(optional)) {
		if (value === undefined) continue
		const outKey = renames[key] ?? key
		out[outKey] = value
	}
	return out
}
