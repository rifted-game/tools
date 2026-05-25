import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineCommand } from 'citty'
import { createJiti } from 'jiti'
import pc from 'picocolors'

export const buildCommand = defineCommand({
	meta: {
		name: 'build',
		description: 'Build mod source files into gcf.json',
	},
	args: {
		entry: {
			type: 'positional',
			description: 'Entry file (default: src/mod.ts)',
			required: false,
			default: 'src/mod.ts',
		},
		out: {
			type: 'string',
			alias: 'o',
			description: 'Output path (default: dist/gcf.json)',
			default: 'dist/gcf.json',
		},
	},
	async run({ args }) {
		const entryPath = resolve(process.cwd(), args.entry)
		const outPath = resolve(process.cwd(), args.out)

		console.log(`${pc.dim('Building')} ${pc.cyan(args.entry)} …`)

		// jiti transparently compiles .ts at runtime in both Node.js and Bun
		const jiti = createJiti(import.meta.url)
		let mod: { default?: unknown }
		try {
			mod = (await jiti.import(entryPath)) as { default?: unknown }
		} catch (err: any) {
			console.error(pc.red('Import failed: ') + err.message)
			process.exit(1)
		}

		const content = mod.default
		if (!content || typeof content !== 'object') {
			console.error(pc.red('Entry must export a default File() value'))
			process.exit(1)
		}

		// ensure output dir exists
		const { mkdirSync } = await import('node:fs')
		mkdirSync(resolve(outPath, '..'), { recursive: true })

		const json = JSON.stringify(content, null, 2)
		writeFileSync(outPath, json, 'utf-8')

		const kb = (Buffer.byteLength(json) / 1024).toFixed(1)
		console.log(`${pc.green('✓')} ${pc.bold(args.out)}${pc.dim(` (${kb} kB)`)}`)
	},
})
