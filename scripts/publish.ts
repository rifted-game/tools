import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, unlinkSync } from 'node:fs'
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

	console.log(`Packing ${pkg.name}...`)
	const packResult = spawnSync('bun', ['pm', 'pack', '--quiet'], {
		cwd: pkgPath,
		shell: true,
	})

	if (packResult.status !== 0) {
		console.error(`Failed to pack package: ${pkg.name}`)
		process.exit(1)
	}

	const tarballName = packResult.stdout.toString().trim()
	const tarballPath = join(pkgPath, tarballName)

	console.log(`Publishing ${tarballName} via npm...`)
	const publishResult = spawnSync(
		'npm',
		['publish', tarballPath, '--provenance', '--access', 'public'],
		{
			cwd: pkgPath,
			stdio: 'inherit',
			shell: true,
		},
	)

	try {
		if (existsSync(tarballPath)) {
			unlinkSync(tarballPath)
		}
	} catch (err) {
		console.warn(`Failed to clean up tarball ${tarballName}:`, err)
	}

	if (publishResult.status !== 0) {
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
