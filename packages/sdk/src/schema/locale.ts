import { z } from 'zod'

/** locale file declaration in the gcf root */
export const LocaleFile = z
	.object({
		lang: z
			.string()
			.regex(/^[a-z]{2}(_[A-Z]{2})?$/, 'expected ISO 639-1 code, e.g. "en" or "en_US"'),
		path: z
			.string()
			.regex(/^locales\/[a-z0-9_/-]+\.ftl$/, 'must be under locales/ and end with .ftl'),
	})
	.strict()

export type LocaleFile = z.infer<typeof LocaleFile>
