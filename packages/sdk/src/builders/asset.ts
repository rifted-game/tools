import type { Asset as AssetSchema } from '../schema/asset'
import type { AssetKind } from '../schema/enums'

/** declare a mod-tier asset. must appear before any reference to its path */
export function Asset(opts: {
	path: string
	kind: AssetKind
	sha256?: string
	preload?: boolean
}): AssetSchema {
	const out: any = { path: opts.path, kind: opts.kind }
	if (opts.sha256 !== undefined) out.sha256 = opts.sha256
	if (opts.preload !== undefined) out.preload = opts.preload
	return out
}
