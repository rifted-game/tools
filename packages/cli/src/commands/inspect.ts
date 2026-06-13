import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { openRmod } from '@rifted/sdk/pack'
import { defineCommand } from 'citty'
import pc from 'picocolors'

const SECTIONS = [
	'cards',
	'modifiers',
	'enemies',
	'watchers',
	'encounters',
	'maps',
	'affinities',
] as const

function printDoc(doc: Record<string, unknown>): void {
	console.log(
		`  ${pc.dim('namespace:')} ${doc.namespace}  ${pc.dim('doc version:')} ${doc.version ?? 1}`,
	)
	if (doc.requires) {
		const reqs = Object.entries(doc.requires as Record<string, number>)
			.map(([ns, v]) => `${ns}>=${v}`)
			.join(', ')
		console.log(`  ${pc.dim('requires:')}  ${reqs}`)
	}
	for (const section of SECTIONS) {
		const entries = doc[section]
		if (!Array.isArray(entries) || entries.length === 0) continue
		const ids = entries.map(e => (e as { id: string }).id)
		console.log(`  ${pc.dim(`${section} (${ids.length}):`)} ${ids.join(', ')}`)
	}
}

export const inspectCommand = defineCommand({
	meta: {
		name: 'inspect',
		description: 'Summarize a .rmod archive or a gcf.json document',
	},
	args: {
		file: {
			type: 'positional',
			required: true,
			description: 'Path to .rmod or gcf.json',
		},
	},
	async run({ args }) {
		const path = resolve(process.cwd(), args.file)
		let buf: Buffer
		try {
			buf = readFileSync(path)
		} catch (err: any) {
			console.error(pc.red(`Failed to read ${args.file}: ${err.message}`))
			process.exit(1)
		}

		if (args.file.endsWith('.json')) {
			const doc = JSON.parse(buf.toString('utf-8'))
			console.log(pc.bold(`${doc.namespace} (gcf.json)`))
			printDoc(doc)
			return
		}

		try {
			const { manifest, gcf, assets, locales } = await openRmod(new Uint8Array(buf))
			console.log(`${pc.bold(manifest.name)}  ${pc.dim(`v${manifest.version}`)}`)
			if (manifest.authors.length > 0) console.log(pc.dim(`by ${manifest.authors.join(', ')}`))
			console.log('')
			printDoc(gcf)
			const localeNames = Object.keys(locales)
			if (localeNames.length > 0) {
				console.log(`  ${pc.dim(`locales (${localeNames.length}):`)} ${localeNames.join(', ')}`)
			}
			const assetPaths = Object.keys(assets)
			if (assetPaths.length > 0) {
				console.log(`  ${pc.dim(`assets (${assetPaths.length}):`)} ${assetPaths.join(', ')}`)
			}
			console.log(`\n${pc.green('✓')} archive verified (hashes ok)`)
		} catch (err: any) {
			console.error(pc.red(`✗ ${err.message}`))
			process.exit(1)
		}
	},
})
