import { resolve } from 'node:path'

import { ftlSyntaxErrors } from '@rifted/sdk/locales'
import { defineCommand } from 'citty'
import pc from 'picocolors'

import { loadMod, readLocaleDir } from '../load'

export const localesCheckCommand = defineCommand({
	meta: {
		name: 'locales:check',
		description: 'Report translation coverage per locale (exit 1 on gaps)',
	},
	args: {
		entry: {
			type: 'positional',
			description: 'Entry file (default: src/index.ts)',
			required: false,
			default: 'src/index.ts',
		},
		lang: {
			type: 'string',
			alias: 'l',
			description: 'Check additional locales (repeatable), e.g. --lang fr',
		},
	},
	async run({ args }) {
		const cwd = process.cwd()
		let loaded: Awaited<ReturnType<typeof loadMod>>
		try {
			loaded = await loadMod(resolve(cwd, args.entry))
		} catch (err: any) {
			console.error(pc.red('Build failed: ') + err.message)
			process.exit(1)
		}
		if (!loaded.locales) {
			console.error(pc.red('Entry does not expose localizable strings (export default a Pkg)'))
			process.exit(1)
		}

		const handwritten = readLocaleDir(cwd)
		const extra = Array.isArray(args.lang) ? args.lang : args.lang ? [args.lang] : []
		const locales = [
			...new Set([...loaded.locales.locales, ...Object.keys(handwritten), ...extra]),
		].sort()

		const total = loaded.locales.entries.reduce((n, e) => n + Object.keys(e.attrs).length, 0)
		if (total === 0 && locales.length === 0) {
			console.log(pc.dim('No localizable strings declared.'))
			return
		}

		let failed = false
		for (const [locale, ftl] of Object.entries(handwritten)) {
			for (const err of ftlSyntaxErrors(ftl)) {
				failed = true
				console.error(`${pc.red('✗')} locales/${locale}.ftl: ${err}`)
			}
		}

		for (const locale of locales) {
			const missing = loaded.locales.missing(locale, handwritten[locale])
			const covered = total - missing.length
			if (missing.length === 0) {
				console.log(`${pc.green('✓')} ${pc.bold(locale)} ${pc.dim(`${covered}/${total}`)}`)
				continue
			}
			failed = true
			console.log(`${pc.red('✗')} ${pc.bold(locale)} ${pc.dim(`${covered}/${total}`)}`)
			for (const m of missing) {
				console.log(`    ${pc.yellow(`${m.id}.${m.attr}`)}  ${pc.dim(m.comment)}`)
			}
			console.log(pc.dim(`    run: rifted locales:scaffold --lang ${locale}`))
		}

		if (failed) process.exit(1)
	},
})
