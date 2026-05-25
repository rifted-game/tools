import type { Condition } from '../schema/condition'
import type { TextWithVariants } from '../schema/text-variants'

/** picks the first entry whose condition is true. last entry without condition serves as fallback */
export function TextVariants(
	entries: Array<{ text: TextWithVariants; condition?: Condition }>,
): TextWithVariants {
	if (entries.length < 1) throw new Error('TextVariants requires at least 1 entry')
	const variants = entries.map(e => {
		const out: any = { text: e.text }
		if (e.condition !== undefined) out.condition = e.condition
		return out
	})
	return { variants }
}

/** uniform random pick from the pool */
export function TextRandom(items: TextWithVariants[]): TextWithVariants {
	if (items.length < 1) throw new Error('TextRandom requires at least 1 entry')
	return { random: items }
}

/** external localization key reference */
export function Loc(key: string): TextWithVariants {
	return { key }
}
