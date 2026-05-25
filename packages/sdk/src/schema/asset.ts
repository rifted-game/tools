import { z } from 'zod'

import { AssetKind } from './enums'

// hashes are computed at pack time and stored in the .rmod manifest,
// so they don't belong in the source declaration
export const Asset = z
	.object({
		path: z.string().regex(/^assets\/[a-z0-9_/.-]+\.(png|webp|ogg|wav)$/),
		kind: AssetKind,
		preload: z.boolean().optional().default(false),
	})
	.strict()

export type Asset = z.infer<typeof Asset>
