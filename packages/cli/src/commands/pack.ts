import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
	buildEntries,
	buildSummary,
	collectFiles,
	computeBundleHash,
	type FileEntry,
	type Manifest,
	packZip,
	sha256,
	validateLocales,
} from '@rifted/sdk/pack'
import { defineCommand } from 'citty'
import pc from 'picocolors'

function die(msg: string): never {
	console.error(pc.red(msg))
	process.exit(1)
}

export const packCommand = defineCommand({
	meta: {
		name: 'pack',
		description: 'Build a distributable .rmod archive',
	},
	args: {
		gcf: {
			type: 'string',
			description: 'Path to built gcf.json (default: dist/gcf.json)',
			default: 'dist/gcf.json',
		},
		out: {
			type: 'string',
			alias: 'o',
			description: 'Output path (default: dist/<namespace>-<version>.rmod)',
		},
	},
	async run({ args }) {
		const cwd = process.cwd()
		const gcfPath = resolve(cwd, args.gcf)

		console.log(`${pc.dim('Packing')} ${pc.cyan(args.gcf)} …`)

		let gcfBuf: Buffer
		let gcf: any
		try {
			gcfBuf = readFileSync(gcfPath)
			gcf = JSON.parse(gcfBuf.toString('utf-8'))
		} catch (err: any) {
			die(`Failed to read ${args.gcf}: ${err.message}`)
		}

		if (!gcf.package?.namespace || !gcf.package?.version) {
			die('gcf.json package block must include namespace and version')
		}
		const { namespace, version } = gcf.package

		const files = collectFiles(cwd, ['assets', 'locales'])

		for (const asset of gcf.assets ?? []) {
			if (!files.has(asset.path)) die(`Asset declared in gcf but missing on disk: ${asset.path}`)
		}
		for (const locale of gcf.locales ?? []) {
			if (!files.has(locale.path))
				die(`Locale file declared in gcf but missing on disk: ${locale.path}`)
		}

		const report = validateLocales(gcf, cwd)
		for (const w of report.warnings) console.warn(`${pc.yellow('warn')} ${w}`)
		if (report.errors.length > 0) {
			for (const e of report.errors) console.error(`${pc.red('error')} ${e}`)
			die('Locale validation failed')
		}

		const fileEntries: Record<string, FileEntry> = {}
		for (const [rel, abs] of files) {
			const buf = readFileSync(abs)
			fileEntries[rel] = { size: buf.byteLength, sha256: sha256(buf) }
		}
		fileEntries['gcf.json'] = { size: gcfBuf!.byteLength, sha256: sha256(gcfBuf!) }

		const isTranslation = (gcf.package.translates?.length ?? 0) > 0
		const manifest: Manifest = {
			manifest_version: 1,
			namespace,
			version,
			name: gcf.package.name ?? namespace,
			author: gcf.package.author,
			description: gcf.package.description,
			homepage: gcf.package.homepage,
			license: gcf.package.license,
			rifted_version: gcf.package.rifted_version ?? '*',
			dependencies: gcf.package.dependencies ?? {},
			kind: isTranslation ? 'translation' : 'content',
			translates: isTranslation ? gcf.package.translates : null,
			bundle_hash: computeBundleHash(fileEntries),
			files: fileEntries,
			summary: buildSummary(gcf),
		}

		const entries = buildEntries(manifest, gcfBuf!, files)
		const zipBuf = await packZip(entries)

		const outPath = args.out
			? resolve(cwd, args.out)
			: resolve(cwd, `dist/${namespace}-${version}.rmod`)
		mkdirSync(resolve(outPath, '..'), { recursive: true })
		writeFileSync(outPath, zipBuf)

		const kb = (zipBuf.byteLength / 1024).toFixed(1)
		console.log('')
		console.log(`${pc.green('✓')} ${pc.bold(outPath)} ${pc.dim(`(${kb} kB)`)}`)
		console.log(`  ${pc.dim('namespace:')}   ${namespace}`)
		console.log(`  ${pc.dim('version:')}     ${version}`)
		console.log(`  ${pc.dim('kind:')}        ${manifest.kind}`)
		console.log(`  ${pc.dim('bundle_hash:')} ${manifest.bundle_hash}`)
		console.log(`  ${pc.dim('files:')}       ${Object.keys(fileEntries).length}`)
		console.log(`  ${pc.dim('locales:')}     ${manifest.summary.locales.join(', ') || '(none)'}`)
	},
})
