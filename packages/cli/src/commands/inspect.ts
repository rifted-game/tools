import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { Manifest, unpackZip } from '@rifted/sdk/pack'
import { defineCommand } from 'citty'
import pc from 'picocolors'

export const inspectCommand = defineCommand({
	meta: {
		name: 'inspect',
		description: 'Print the manifest of a .rmod archive without extracting it',
	},
	args: {
		file: {
			type: 'positional',
			required: true,
			description: 'Path to .rmod file',
		},
		full: {
			type: 'boolean',
			default: false,
			description: 'Print the full file list',
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

		const entries = await unpackZip(buf)
		const manifestBuf = entries.get('manifest.json')
		if (!manifestBuf) {
			console.error(pc.red('No manifest.json — is this a valid .rmod?'))
			process.exit(1)
		}

		const parsed = Manifest.safeParse(JSON.parse(manifestBuf.toString('utf-8')))
		if (!parsed.success) {
			console.error(pc.red('Manifest validation failed:'))
			for (const issue of parsed.error.issues) {
				console.error(`  ${issue.path.join('.')}: ${issue.message}`)
			}
			process.exit(1)
		}
		const m = parsed.data

		console.log(`${pc.bold(m.name)}  ${pc.dim(`v${m.version}`)}`)
		if (m.author) console.log(pc.dim(`by ${m.author}`))
		if (m.description) console.log(`${m.description}`)
		console.log('')
		console.log(`  ${pc.dim('namespace:')}   ${m.namespace}`)
		console.log(`  ${pc.dim('kind:')}        ${m.kind}`)
		if (m.translates) console.log(`  ${pc.dim('translates:')} ${m.translates.join(', ')}`)
		console.log(`  ${pc.dim('rifted:')}      ${m.rifted_version}`)
		console.log(`  ${pc.dim('bundle_hash:')} ${m.bundle_hash}`)

		if (Object.keys(m.dependencies).length > 0) {
			console.log(`  ${pc.dim('dependencies:')}`)
			for (const [name, ver] of Object.entries(m.dependencies)) {
				console.log(`    ${name} ${ver}`)
			}
		}

		const s = m.summary
		const counts: [string, number][] = [
			['cards', s.cards],
			['buffs', s.buffs],
			['relics', s.relics],
			['enemies', s.enemies],
			['summons', s.summons],
			['encounters', s.encounters],
			['locations', s.locations],
			['match_modes', s.match_modes],
		]
		const nonzero = counts.filter(([, n]) => n > 0)
		if (nonzero.length > 0) {
			console.log('')
			for (const [name, n] of nonzero) console.log(`  ${name}: ${n}`)
		}
		console.log(`  locales: ${s.locales.join(', ') || '(none)'}`)

		if (args.full) {
			console.log('')
			console.log(pc.dim('Files:'))
			for (const [filePath, entry] of Object.entries(m.files)) {
				console.log(
					`  ${entry.sha256.slice(0, 12)}  ${String(entry.size).padStart(8)}  ${filePath}`,
				)
			}
		} else {
			console.log('')
			console.log(pc.dim(`${Object.keys(m.files).length} files  (--full to list)`))
		}
	},
})
