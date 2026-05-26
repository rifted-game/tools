import { mkdirSync, watch, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { defineCommand } from 'citty'
import { createJiti } from 'jiti'
import pc from 'picocolors'

async function runBuild(entryPath: string, outPath: string): Promise<boolean> {
	// new instance per run so jiti doesn't serve stale module cache
	const jiti = createJiti(import.meta.url, { cache: false })
	let mod: { default?: unknown }
	try {
		mod = (await jiti.import(entryPath)) as { default?: unknown }
	} catch (err: any) {
		console.error(pc.red('Import failed: ') + err.message)
		return false
	}

	const content = mod.default
	if (!content || typeof content !== 'object') {
		console.error(pc.red('Entry must export a default File() value'))
		return false
	}

	mkdirSync(resolve(outPath, '..'), { recursive: true })
	const json = JSON.stringify(content, null, 2)
	writeFileSync(outPath, json, 'utf-8')

	const kb = (Buffer.byteLength(json) / 1024).toFixed(1)
	console.log(`${pc.green('✓')} ${pc.bold(outPath)}${pc.dim(` (${kb} kB)`)}`)
	return true
}

export const buildCommand = defineCommand({
	meta: {
		name: 'build',
		description: 'Build mod source files into gcf.json',
	},
	args: {
		entry: {
			type: 'positional',
			description: 'Entry file (default: src/index.ts)',
			required: false,
			default: 'src/index.ts',
		},
		out: {
			type: 'string',
			alias: 'o',
			description: 'Output path (default: dist/gcf.json)',
			default: 'dist/gcf.json',
		},
		watch: {
			type: 'boolean',
			alias: 'w',
			description: 'Rebuild on source changes',
			default: false,
		},
	},
	async run({ args }) {
		const entryPath = resolve(process.cwd(), args.entry)
		const outPath = resolve(process.cwd(), args.out)

		console.log(`${pc.dim('Building')} ${pc.cyan(args.entry)} …`)
		await runBuild(entryPath, outPath)

		if (!args.watch) return

		const srcDir = resolve(process.cwd(), dirname(args.entry))
		console.log(`${pc.dim('Watching')} ${pc.cyan(dirname(args.entry))} …`)

		let debounceTimer: ReturnType<typeof setTimeout> | null = null

		watch(srcDir, { recursive: true }, (_, filename) => {
			if (!filename?.endsWith('.ts')) return
			if (debounceTimer) clearTimeout(debounceTimer)
			debounceTimer = setTimeout(async () => {
				const time = new Date().toLocaleTimeString('en', { hour12: false })
				console.log(`\n${pc.dim(time)} ${pc.yellow('↺')} ${filename}`)
				await runBuild(entryPath, outPath)
			}, 150)
		})

		// keep the process alive
		await new Promise(() => {})
	},
})
