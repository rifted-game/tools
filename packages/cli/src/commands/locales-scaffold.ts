import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { scaffoldFtl } from '@rifted/sdk/pack'
import { defineCommand } from 'citty'
import pc from 'picocolors'

export const localesScaffoldCommand = defineCommand({
	meta: {
		name: 'locales:scaffold',
		description: 'Generate or extend ftl files with stubs for missing localization keys',
	},
	args: {
		lang: {
			type: 'string',
			required: true,
			description: 'Language code, e.g. en, ru',
		},
		gcf: {
			type: 'string',
			description: 'Path to built gcf.json (default: dist/gcf.json)',
			default: 'dist/gcf.json',
		},
		out: {
			type: 'string',
			description: 'Output ftl path (default: locales/<lang>.ftl)',
		},
	},
	run({ args }) {
		const cwd = process.cwd()
		const gcfPath = resolve(cwd, args.gcf)
		const ftlPath = args.out ? resolve(cwd, args.out) : resolve(cwd, `locales/${args.lang}.ftl`)

		let gcf: object
		try {
			gcf = JSON.parse(readFileSync(gcfPath, 'utf-8'))
		} catch (err: any) {
			console.error(pc.red(`Failed to read ${args.gcf}: ${err.message}`))
			console.error(pc.dim('Run `rifted build` first'))
			process.exit(1)
		}

		const existingFtl = existsSync(ftlPath) ? readFileSync(ftlPath, 'utf-8') : undefined
		const result = scaffoldFtl({ gcf, existingFtl, lang: args.lang })

		if (result === (existingFtl ?? '')) {
			console.log(`${pc.green('✓')} No new keys — ${pc.cyan(args.lang)} is up to date`)
			return
		}

		mkdirSync(dirname(ftlPath), { recursive: true })
		writeFileSync(ftlPath, result, 'utf-8')

		const action = existingFtl === undefined ? 'Created' : 'Extended'
		console.log(`${pc.green('✓')} ${action} ${pc.bold(ftlPath)}`)
		console.log(pc.dim('  Fill in the TODO entries before packing'))
	},
})
