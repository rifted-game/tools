import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { openRmod } from '@rifted/sdk/pack'
import { defineCommand } from 'citty'
import pc from 'picocolors'

import { diffDocuments, renderValue } from '../diff'

async function readDoc(path: string, label: string): Promise<Record<string, unknown>> {
	const buf = readFileSync(resolve(process.cwd(), path))
	if (label.endsWith('.rmod')) return (await openRmod(buf)).gcf
	return JSON.parse(buf.toString('utf-8'))
}

export const diffCommand = defineCommand({
	meta: {
		name: 'diff',
		description: 'Semantic diff of two GCF documents (balance review, changelogs)',
	},
	args: {
		old: {
			type: 'positional',
			required: true,
			description: 'The older gcf.json or .rmod',
		},
		new: {
			type: 'positional',
			required: false,
			description: 'The newer document (default: dist/gcf.json)',
			default: 'dist/gcf.json',
		},
	},
	async run({ args }) {
		let before: Record<string, unknown>
		let after: Record<string, unknown>
		try {
			before = await readDoc(args.old, args.old)
			after = await readDoc(args.new, args.new)
		} catch (err: any) {
			console.error(pc.red(err.message))
			process.exit(1)
		}

		const changes = diffDocuments(before, after)
		if (changes.length === 0) {
			console.log(`${pc.green('✓')} no content changes`)
			return
		}

		for (const c of changes) {
			switch (c.kind) {
				case 'added':
					console.log(`${pc.green('+')} ${c.path}`)
					break
				case 'removed':
					console.log(`${pc.red('-')} ${c.path}`)
					break
				case 'changed':
					console.log(
						`${pc.yellow('~')} ${c.path}: ${pc.red(renderValue(c.before))} → ${pc.green(renderValue(c.after))}`,
					)
					break
			}
		}
		console.log(pc.dim(`\n${changes.length} change(s)`))
	},
})
