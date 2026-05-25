import { z } from 'zod'

import { AssetKind } from './enums'

const Sha256 = z.string().regex(/^[a-f0-9]{64}$/, 'lowercase hex sha256 required')

export const Asset = z
	.object({
		path: z.string().regex(/^assets\/[a-z0-9_/.-]+\.(png|webp|ogg|wav)$/),
		kind: AssetKind,
		sha256: Sha256.optional(),
		preload: z.boolean().optional().default(false),
	})
	.strict()

export type Asset = z.infer<typeof Asset>
