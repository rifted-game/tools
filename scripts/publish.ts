import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

const packagesDir = join(process.cwd(), 'packages')
const dirs = readdirSync(packagesDir)

// Map every local workspace package name -> its current version. Used to verify
// that internal deps in the packed tarball were rewritten to the matching
// version. bun pm pack reads workspace versions from bun.lock, which can go
// stale and silently publish a wrong pin (e.g. cli depending on an old sdk).
// The `version-packages` script regenerates bun.lock after the bump to keep
// it fresh; this check stays as defense-in-depth if that ever regresses.
const workspaceVersions = new Map<string, string>()
for (const dir of dirs) {
	const p = join(packagesDir, dir, 'package.json')
	if (!existsSync(p)) continue
	const pkg = JSON.parse(readFileSync(p, 'utf-8'))
	if (pkg.name && pkg.version) workspaceVersions.set(pkg.name, pkg.version)
}

// Read the package.json embedded in a packed .tgz (entry: package/package.json).
function readPackedManifest(tarballPath: string): Record<string, unknown> {
	const res = spawnSync('tar', ['-xzO', '-f', tarballPath, 'package/package.json'], {
		encoding: 'utf-8',
	})
	if (res.status !== 0) {
		throw new Error(`Failed to read package.json from tarball ${tarballPath}: ${res.stderr}`)
	}
	return JSON.parse(res.stdout)
}

// Fail the release if any internal @rifted/* dep in the tarball is unresolved
// (still `workspace:`) or pinned to a version other than the one we're shipping.
function assertInternalDeps(tarballPath: string, pkgName: string): void {
	const manifest = readPackedManifest(tarballPath)
	const deps = (manifest.dependencies ?? {}) as Record<string, string>
	for (const [depName, range] of Object.entries(deps)) {
		const expected = workspaceVersions.get(depName)
		if (expected === undefined) continue // external dep, not our concern
		if (range.startsWith('workspace:')) {
			console.error(
				`${pkgName}: internal dep ${depName} was not rewritten (still "${range}") in the tarball`,
			)
			process.exit(1)
		}
		if (range !== expected) {
			console.error(
				`${pkgName}: internal dep ${depName} pinned to "${range}" but workspace is at "${expected}". ` +
					`bun.lock is likely stale — regenerate it (rm bun.lock && bun install) and re-release.`,
			)
			process.exit(1)
		}
	}
}

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

	// guardrail: ensure internal @rifted/* deps were rewritten to the matching
	// version before this goes to npm (immutable once published)
	assertInternalDeps(tarballPath, pkg.name)

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
