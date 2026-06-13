import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { defineCommand } from 'citty'
import pc from 'picocolors'

import { loadMod } from '../load'

export const localesScaffoldCommand = defineCommand({
	meta: {
		name: 'locales:scaffold',
		description: 'Append stubs for untranslated strings to locales/<lang>.ftl',
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
			required: true,
			description: 'Target locale, e.g. en or ru',
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

		const dir = join(cwd, 'locales')
		const file = join(dir, `${args.lang}.ftl`)
		const existing = existsSync(file) ? readFileSync(file, 'utf-8') : undefined

		const stubs = loaded.locales.scaffold(args.lang, existing)
		if (stubs === null) {
			console.log(
				`${pc.green('✓')} ${pc.bold(`locales/${args.lang}.ftl`)} already covers every key`,
			)
			return
		}

		mkdirSync(dir, { recursive: true })
		if (existing !== undefined) {
			appendFileSync(file, `\n${stubs}`)
		} else {
			writeFileSync(file, stubs)
		}
		const added = (stubs.match(/^[a-zA-Z][a-zA-Z0-9_-]* =$/gm) ?? []).length
		console.log(
			`${pc.green('✓')} ${pc.bold(`locales/${args.lang}.ftl`)}${pc.dim(` (+${added} messages — fill in the TODOs)`)}`,
		)
	},
})
