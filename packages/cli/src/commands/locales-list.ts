import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { expectedKeysFromGcf } from '@rifted/sdk/pack'
import { defineCommand } from 'citty'
import pc from 'picocolors'

export const localesListCommand = defineCommand({
	meta: {
		name: 'locales:list',
		description: 'Print all localization keys expected by the built gcf.json',
	},
	args: {
		gcf: {
			type: 'string',
			description: 'Path to built gcf.json (default: dist/gcf.json)',
			default: 'dist/gcf.json',
		},
	},
	run({ args }) {
		const cwd = process.cwd()

		let gcf: any
		try {
			gcf = JSON.parse(readFileSync(resolve(cwd, args.gcf), 'utf-8'))
		} catch (err: any) {
			console.error(pc.red(`Failed to read ${args.gcf}: ${err.message}`))
			process.exit(1)
		}

		const { required, optional } = expectedKeysFromGcf(gcf)

		const reqSorted = [...required].sort(([a], [b]) => (a < b ? -1 : 1))
		const optSorted = [...optional].sort(([a], [b]) => (a < b ? -1 : 1))

		console.log(`${pc.bold('Required')} ${pc.dim('(missing = error)')}`)
		for (const [key, owner] of reqSorted) {
			console.log(`  ${key}  ${pc.dim(owner)}`)
		}
		if (required.size === 0) console.log(pc.dim('  (none)'))

		console.log('')
		console.log(`${pc.bold('Optional')} ${pc.dim('(missing = warning)')}`)
		for (const [key, owner] of optSorted) {
			console.log(`  ${key}  ${pc.dim(owner)}`)
		}
		if (optional.size === 0) console.log(pc.dim('  (none)'))

		console.log('')
		console.log(pc.dim(`${required.size + optional.size} keys total`))
	},
})
