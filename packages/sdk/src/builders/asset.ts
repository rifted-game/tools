import type { Asset as AssetSchema } from '../schema/asset'
import type { AssetKind } from '../schema/enums'

/**
 * Declare a mod asset. Hashes are computed at pack time and stored in the
 * .rmod manifest — no need to specify them here.
 */
export function Asset(opts: { path: string; kind: AssetKind; preload?: boolean }): AssetSchema {
	const out: any = { path: opts.path, kind: opts.kind }
	if (opts.preload !== undefined) out.preload = opts.preload
	return out
}
