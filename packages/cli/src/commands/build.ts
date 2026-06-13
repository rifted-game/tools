import { mkdirSync, watch, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { validateDocument } from '@rifted/sdk/schema'
import { defineCommand } from 'citty'
import pc from 'picocolors'

import { assembleLocales, loadMod } from '../load'

async function runBuild(entryPath: string, outPath: string): Promise<boolean> {
	let doc: Record<string, unknown>
	let localeFiles: Record<string, string>
	try {
		const loaded = await loadMod(entryPath)
		doc = loaded.doc
		validateDocument(doc)
		localeFiles = assembleLocales(process.cwd(), loaded.locales)
	} catch (err: any) {
		console.error(pc.red('Build failed: ') + err.message)
		return false
	}

	const outDir = resolve(outPath, '..')
	mkdirSync(outDir, { recursive: true })
	const json = JSON.stringify(doc, null, 2)
	writeFileSync(outPath, `${json}\n`, 'utf-8')

	const localeNames = Object.keys(localeFiles)
	if (localeNames.length > 0) {
		mkdirSync(join(outDir, 'locales'), { recursive: true })
		for (const [locale, ftl] of Object.entries(localeFiles)) {
			writeFileSync(join(outDir, 'locales', `${locale}.ftl`), ftl, 'utf-8')
		}
	}

	const kb = (Buffer.byteLength(json) / 1024).toFixed(1)
	const counts = ['cards', 'modifiers', 'enemies', 'watchers', 'encounters', 'maps', 'affinities']
		.map(s => {
			const arr = doc[s]
			return Array.isArray(arr) && arr.length > 0 ? `${arr.length} ${s}` : null
		})
		.filter(Boolean)
		.join(', ')
	const loc = localeNames.length > 0 ? ` · locales: ${localeNames.join(', ')}` : ''
	console.log(`${pc.green('✓')} ${pc.bold(outPath)}${pc.dim(` (${kb} kB · ${counts}${loc})`)}`)
	return true
}

export const buildCommand = defineCommand({
	meta: {
		name: 'build',
		description: 'Build mod sources into gcf.json (+ dist/locales/*.ftl)',
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
		const ok = await runBuild(entryPath, outPath)
		if (!ok && !args.watch) process.exit(1)

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
