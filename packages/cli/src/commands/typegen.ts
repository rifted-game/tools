import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

import { openRmod } from '@rifted/sdk/pack'
import { defineCommand } from 'citty'
import pc from 'picocolors'

import { generatePackage, generateRefsModule } from '../typegen'

export const typegenCommand = defineCommand({
	meta: {
		name: 'typegen',
		description: 'Generate a typed refs module (or package) from another mod',
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
			description: 'Output path (module: src/deps/<ns>.ts; package: <ns>-types/)',
		},
		package: {
			type: 'boolean',
			description: 'Emit a publishable typed-bridge package instead of a single module',
			default: false,
		},
		name: {
			type: 'string',
			description: 'Package name (--package only; default @<ns>/types)',
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

		const ns = String(doc.namespace ?? '')
		const source = basename(args.file)

		try {
			if (args.package) {
				const files = generatePackage(doc, source, { name: args.name })
				const dir = resolve(process.cwd(), args.out ?? `${ns}-types`)
				mkdirSync(dir, { recursive: true })
				for (const [name, content] of Object.entries(files)) {
					writeFileSync(join(dir, name), content, 'utf-8')
				}
				const pkgName = JSON.parse(files['package.json']).name
				console.log(
					`${pc.green('✓')} ${pc.bold(dir)}${pc.dim(` (${pkgName} — publish-ready: bun publish)`)}`,
				)
				return
			}

			const code = generateRefsModule(doc, source)
			const outPath = resolve(process.cwd(), args.out ?? `src/deps/${ns}.ts`)
			mkdirSync(resolve(outPath, '..'), { recursive: true })
			writeFileSync(outPath, code, 'utf-8')
			const exports = (code.match(/^export const /gm) ?? []).length
			console.log(
				`${pc.green('✓')} ${pc.bold(outPath)}${pc.dim(` (${exports} exports — import and pass to requires: [...])`)}`,
			)
		} catch (err: any) {
			console.error(pc.red(`typegen failed: ${err.message}`))
			process.exit(1)
		}
	},
})
