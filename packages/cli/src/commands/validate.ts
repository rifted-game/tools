import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineCommand } from 'citty'
import pc from 'picocolors'

export const validateCommand = defineCommand({
	meta: {
		name: 'validate',
		description: 'Validate a built gcf.json against the Rifted schema',
	},
	args: {
		file: {
			type: 'positional',
			description: 'Path to gcf.json (default: dist/gcf.json)',
			required: false,
			default: 'dist/gcf.json',
		},
	},
	async run({ args }) {
		const filePath = resolve(process.cwd(), args.file)

		console.log(`${pc.dim('Validating')} ${pc.cyan(args.file)} …`)

		let raw: unknown
		try {
			raw = JSON.parse(readFileSync(filePath, 'utf-8'))
		} catch (err: any) {
			console.error(pc.red('Read failed: ') + err.message)
			process.exit(1)
		}

		// dynamic import keeps the sdk optional in the cli bundle path
		const { File } = await import('@rifted/sdk/schema')

		const result = File.safeParse(raw)

		if (!result.success) {
			console.error(pc.red('Validation failed'))
			for (const issue of result.error.issues) {
				const path = issue.path.join('.')
				console.error(`  ${pc.yellow(path || '<root>')}  ${pc.dim(issue.message)}`)
			}
			process.exit(1)
		}

		const cards = (raw as any).cards?.length ?? 0
		const buffs = (raw as any).buffs?.length ?? 0
		const relics = (raw as any).relics?.length ?? 0
		const enemies = (raw as any).enemies?.length ?? 0

		console.log(`${pc.green('✓')} Valid GCF`)
		if (cards) console.log(`  ${pc.dim(`cards: ${cards}`)}`)
		if (buffs) console.log(`  ${pc.dim(`buffs: ${buffs}`)}`)
		if (relics) console.log(`  ${pc.dim(`relics: ${relics}`)}`)
		if (enemies) console.log(`  ${pc.dim(`enemies: ${enemies}`)}`)
	},
})
