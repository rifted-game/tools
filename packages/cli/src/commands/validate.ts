import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { defineCommand } from 'citty'
import pc from 'picocolors'

export const validateCommand = defineCommand({
	meta: {
		name: 'validate',
		description: 'Validate a built gcf.json against the Rifted schema',
	},
	args: {
		file: {
			type: 'positional',
			description: 'Path to gcf.json (default: dist/gcf.json)',
			required: false,
			default: 'dist/gcf.json',
		},
		skipLocales: {
			type: 'boolean',
			default: false,
			description: 'Skip locale file validation',
		},
	},
	async run({ args }) {
		const cwd = process.cwd()
		const filePath = resolve(cwd, args.file)

		console.log(`${pc.dim('Validating')} ${pc.cyan(args.file)} …`)

		let raw: unknown
		try {
			raw = JSON.parse(readFileSync(filePath, 'utf-8'))
		} catch (err: any) {
			console.error(`${pc.red('Read failed:')} ${err.message}`)
			process.exit(1)
		}

		const { File } = await import('@rifted/sdk/schema')
		const result = File.safeParse(raw)
		if (!result.success) {
			console.error(pc.red('Schema validation failed'))
			for (const issue of result.error.issues) {
				const path = issue.path.join('.')
				console.error(`  ${pc.yellow(path || '<root>')}  ${pc.dim(issue.message)}`)
			}
			process.exit(1)
		}
		console.log(`${pc.green('✓')} Schema OK`)

		const gcf = raw as any
		if (!args.skipLocales && gcf.locales) {
			const { validateLocales } = await import('@rifted/sdk/pack')
			const report = validateLocales(gcf, cwd)
			for (const w of report.warnings) console.warn(`${pc.yellow('warn')} ${w}`)
			if (report.errors.length > 0) {
				for (const e of report.errors) console.error(`${pc.red('error')} ${e}`)
				process.exit(1)
			}
			console.log(`${pc.green('✓')} Locales OK`)
		}

		const count = (k: string) => gcf[k]?.length ?? 0
		for (const name of ['cards', 'buffs', 'relics', 'enemies', 'encounters', 'locations']) {
			if (count(name) > 0) console.log(`  ${pc.dim(`${name}:`)} ${count(name)}`)
		}
	},
})
