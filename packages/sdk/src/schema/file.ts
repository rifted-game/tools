import { z } from 'zod'

import { Asset } from './asset'
import { Buff } from './buff'
import { Card } from './card'
import { Encounter } from './encounter'
import { Enemy } from './enemy'
import { LocaleFile } from './locale'
import { Location } from './location'
import { MatchMode } from './match-mode'
import { NamespacedStateKey } from './primitives'
import { Relic } from './relic'
import { Summon } from './summon'

const PackageInfo = z
	.object({
		namespace: z.string().regex(/^[a-z][a-z0-9_]*$/, 'namespace must be snake_case'),
		version: z.string().min(1),
		name: z.string().optional(),
		author: z.string().optional(),
		description: z.string().optional(),
		homepage: z.string().optional(),
		license: z.string().optional(),
		rifted_version: z.string().optional(),
		dependencies: z.record(z.string(), z.string()).optional(),
		// set to declare a translation mod; must list the namespaces being translated.
		// translation mods may only contain locales, no content sections
		translates: z
			.array(z.string().regex(/^[a-z][a-z0-9_]*$/))
			.min(1)
			.optional(),
	})
	.strict()

const CONTENT_SECTIONS = [
	'assets',
	'cards',
	'buffs',
	'relics',
	'enemies',
	'summons',
	'encounters',
	'locations',
	'match_modes',
] as const

// sections whose ids are namespaced (namespace:name format).
// buffs are excluded - they use bare ids, with the namespace coming from package
const NAMESPACED_ID_SECTIONS = [
	'cards',
	'relics',
	'enemies',
	'summons',
	'encounters',
	'locations',
	'match_modes',
] as const

export const File = z
	.object({
		format_version: z.literal(1),
		package: PackageInfo.optional(),
		locales: z.array(LocaleFile).min(1).optional(),
		assets: z.array(Asset).min(1).optional(),
		cards: z.array(Card).min(1).optional(),
		buffs: z.array(Buff).min(1).optional(),
		relics: z.array(Relic).min(1).optional(),
		enemies: z.array(Enemy).min(1).optional(),
		summons: z.array(Summon).min(1).optional(),
		encounters: z.array(Encounter).min(1).optional(),
		locations: z.array(Location).min(1).optional(),
		match_modes: z.array(MatchMode).min(1).optional(),
		// non-zero starting values for run.state.<ns:key>, seeded at run start.
		// unset keys already read as 0, so only declare non-zero defaults here.
		initial_run_state: z.record(NamespacedStateKey, z.number()).optional(),
	})
	.strict()
	.superRefine((f, ctx) => {
		if (isTranslationMod(f)) {
			validateTranslationMod(f, ctx)
			return
		}
		validateContentMod(f, ctx)
		validateNamespacePrefixes(f, ctx)
	})

export type File = z.infer<typeof File>

// ---------------------------------------------------------------------------
// mode detection
// ---------------------------------------------------------------------------

function isTranslationMod(f: any): boolean {
	return (f.package?.translates?.length ?? 0) > 0
}

function hasContentSections(f: any): boolean {
	return CONTENT_SECTIONS.some(k => f[k] !== undefined)
}

// ---------------------------------------------------------------------------
// translation-mod rules
// ---------------------------------------------------------------------------

function validateTranslationMod(f: any, ctx: z.RefinementCtx): void {
	if (hasContentSections(f)) {
		ctx.addIssue({
			code: 'custom',
			message:
				'translation mods (package.translates) cannot declare content sections, only locales',
		})
	}
	if (f.locales === undefined) {
		ctx.addIssue({
			code: 'custom',
			message: 'translation mods must declare at least one locale file',
		})
	}
}

// ---------------------------------------------------------------------------
// content-mod rules
// ---------------------------------------------------------------------------

function validateContentMod(f: any, ctx: z.RefinementCtx): void {
	if (!hasContentSections(f) && f.locales === undefined) {
		ctx.addIssue({
			code: 'custom',
			message: 'gcf file must contain at least one content section or locales',
		})
	}
}

// every namespaced entity id must be prefixed with the declared package namespace.
// catches the common mistake of Pkg('foo') + package.namespace = 'bar'
function validateNamespacePrefixes(f: any, ctx: z.RefinementCtx): void {
	const ns = f.package?.namespace
	if (!ns) return

	const expectedPrefix = `${ns}:`

	for (const section of NAMESPACED_ID_SECTIONS) {
		const items = f[section] as Array<{ id: string }> | undefined
		if (!items) continue

		for (let i = 0; i < items.length; i++) {
			if (!items[i].id.startsWith(expectedPrefix)) {
				ctx.addIssue({
					code: 'custom',
					path: [section, i, 'id'],
					message: `id "${items[i].id}" must start with "${expectedPrefix}" to match package.namespace`,
				})
			}
		}
	}
}
