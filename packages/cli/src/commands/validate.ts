import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { validateDocument } from '@rifted/sdk/schema'
import { defineCommand } from 'citty'
import pc from 'picocolors'

export const validateCommand = defineCommand({
	meta: {
		name: 'validate',
		description: 'Validate a gcf.json document against the GCF schema and op tables',
	},
	args: {
		file: {
			type: 'positional',
			description: 'Path to gcf.json (default: dist/gcf.json)',
			required: false,
			default: 'dist/gcf.json',
		},
	},
	run({ args }) {
		const path = resolve(process.cwd(), args.file)
		let doc: unknown
		try {
			doc = JSON.parse(readFileSync(path, 'utf-8'))
		} catch (err: any) {
			console.error(pc.red('Cannot read document: ') + err.message)
			process.exit(1)
		}

		try {
			validateDocument(doc)
		} catch (err: any) {
			console.error(`${pc.red('✗')} ${pc.bold(args.file)} is not a valid GCF document:\n`)
			console.error(err.message)
			process.exit(1)
		}
		console.log(`${pc.green('✓')} ${pc.bold(args.file)} is a valid GCF document`)
	},
})
