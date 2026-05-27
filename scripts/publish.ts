import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const packagesDir = join(process.cwd(), 'packages')
const dirs = readdirSync(packagesDir)

for (const dir of dirs) {
	const pkgPath = join(packagesDir, dir)
	const packageJsonPath = join(pkgPath, 'package.json')

	if (!existsSync(packageJsonPath)) continue

	const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
	if (pkg.private) {
		console.log(`Skipping private package: ${pkg.name}`)
		continue
	}

	console.log(`Publishing ${pkg.name}...`)
	const result = spawnSync('bun', ['publish'], {
		cwd: pkgPath,
		stdio: 'inherit',
		shell: true,
	})

	if (result.status !== 0) {
		console.error(`Failed to publish package: ${pkg.name}`)
		process.exit(1)
	}
}

console.log('Generating git tags...')
const tagResult = spawnSync('bunx', ['changeset', 'tag'], { stdio: 'inherit', shell: true })
if (tagResult.status !== 0) {
	console.error('Failed to generate git tags')
	process.exit(1)
}
