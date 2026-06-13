import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { packRmod } from '@rifted/sdk/pack'
import { defineCommand } from 'citty'
import pc from 'picocolors'

import { assembleLocales, loadMod } from '../load'

function die(msg: string): never {
	console.error(pc.red(msg))
	process.exit(1)
}

/** collect assets/** recursively; archive paths are POSIX, relative to the mod root */
function collectAssets(root: string): Record<string, Uint8Array> {
	const assetsDir = join(root, 'assets')
	const out: Record<string, Uint8Array> = {}
	if (!existsSync(assetsDir)) return out
	const walk = (dir: string) => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const full = join(dir, entry.name)
			if (entry.isDirectory()) walk(full)
			else out[relative(root, full).replaceAll('\\', '/')] = new Uint8Array(readFileSync(full))
		}
	}
	walk(assetsDir)
	return out
}

export const packCommand = defineCommand({
	meta: {
		name: 'pack',
		description: 'Build sources and pack a distributable .rmod archive',
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
			description: 'Output path (default: dist/<namespace>-<version>.rmod)',
		},
	},
	async run({ args }) {
		const cwd = process.cwd()
		console.log(`${pc.dim('Packing')} ${pc.cyan(args.entry)} …`)

		let loaded: Awaited<ReturnType<typeof loadMod>>
		try {
			loaded = await loadMod(resolve(cwd, args.entry))
		} catch (err: any) {
			die(`Build failed: ${err.message}`)
		}

		const assets = collectAssets(cwd)
		const locales = assembleLocales(cwd, loaded.locales)
		const { data, manifest } = await packRmod({
			gcf: loaded.doc,
			name: loaded.meta.name,
			version: loaded.meta.semver,
			authors: [...loaded.meta.authors],
			assets,
			locales,
		})

		const outPath = resolve(
			cwd,
			args.out ?? join('dist', `${manifest.namespace}-${manifest.version}.rmod`),
		)
		mkdirSync(resolve(outPath, '..'), { recursive: true })
		writeFileSync(outPath, data)

		const kb = (data.byteLength / 1024).toFixed(1)
		const assetCount = Object.keys(manifest.assets).length
		const localeNames = Object.keys(manifest.locales ?? {})
		const loc = localeNames.length > 0 ? ` · locales: ${localeNames.join(', ')}` : ''
		console.log(
			`${pc.green('✓')} ${pc.bold(relative(cwd, outPath))}` +
				pc.dim(` (${kb} kB · ${assetCount} assets${loc} · ns ${manifest.namespace})`),
		)
	},
})
