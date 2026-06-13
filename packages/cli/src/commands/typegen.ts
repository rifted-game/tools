import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'

import { openRmod } from '@rifted/sdk/pack'
import { defineCommand } from 'citty'
import pc from 'picocolors'

import { generateRefsModule } from '../typegen'

export const typegenCommand = defineCommand({
	meta: {
		name: 'typegen',
		description: 'Generate a typed refs module from another mod (gcf.json or .rmod)',
	},
	args: {
		file: {
			type: 'positional',
			required: true,
			description: "Path to the other mod's gcf.json or .rmod",
		},
		out: {
			type: 'string',
			alias: 'o',
			description: 'Output path (default: src/deps/<namespace>.ts)',
		},
	},
	async run({ args }) {
		const path = resolve(process.cwd(), args.file)
		let doc: Record<string, unknown>
		try {
			const buf = readFileSync(path)
			doc = args.file.endsWith('.rmod')
				? (await openRmod(buf)).gcf
				: JSON.parse(buf.toString('utf-8'))
		} catch (err: any) {
			console.error(pc.red(`Failed to read ${args.file}: ${err.message}`))
			process.exit(1)
		}

		let code: string
		try {
			code = generateRefsModule(doc, basename(args.file))
		} catch (err: any) {
			console.error(pc.red(`typegen failed: ${err.message}`))
			process.exit(1)
		}

		const outPath = resolve(process.cwd(), args.out ?? `src/deps/${doc.namespace}.ts`)
		mkdirSync(resolve(outPath, '..'), { recursive: true })
		writeFileSync(outPath, code, 'utf-8')

		const exports = (code.match(/^export const /gm) ?? []).length
		console.log(
			`${pc.green('✓')} ${pc.bold(outPath)}${pc.dim(` (${exports} exports — add requires: { ${doc.namespace}: ${doc.version ?? 1} } to your Pkg)`)}`,
		)
	},
})
