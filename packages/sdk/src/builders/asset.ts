import type { z } from 'zod'

import type { Asset as AssetSchema, Asset as AssetZod } from '../schema/asset'
import type { AssetKind } from '../schema/enums'

/**
 * Declare a mod asset. Hashes are computed at pack time and stored in the
 * .rmod manifest — no need to specify them here.
 */
export function Asset(opts: { path: string; kind: AssetKind; preload?: boolean }): AssetSchema {
	// satisfies checks the shape against the schema input statically — a typo in a
	// key fails here, not silently at .parse() time
	return {
		path: opts.path,
		kind: opts.kind,
		...(opts.preload !== undefined && { preload: opts.preload }),
	} satisfies z.input<typeof AssetZod> as AssetSchema
}
