import { z } from 'zod'

import { ModifierTrigger } from './enums'
import { Listener } from './listener'
import { Value } from './value'

const RenderContributionKey = z
	.string()
	.regex(/^([a-z][a-z0-9_]*|[a-z][a-z0-9_]*:[a-z][a-z0-9_]*)$/)

export const AsModifier = z
	.object({
		trigger: ModifierTrigger,
		listener: Listener,
		render_contribution: z.record(RenderContributionKey, Value).optional(),
	})
	.strict()

export type AsModifier = z.infer<typeof AsModifier>
