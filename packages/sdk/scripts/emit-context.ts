// generates dist/rifted-sdk-context.txt — a single file for AI assistants.
//
// includes: builder declarations (public API) + enum/primitive types + key
// convention + gcf json schema. intentionally excludes the raw zod schema
// declarations which are massive and not useful in chat context.

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = dirname(fileURLToPath(import.meta.url))
const dist = join(__dir, '..', 'dist')
const root = join(__dir, '..')

function read(rel: string): string {
	return readFileSync(join(dist, rel), 'utf-8')
		.split('\n')
		.filter(l => !l.startsWith('//# sourceMappingURL='))
		.join('\n')
		.trimEnd()
}

function section(title: string, content: string): string {
	const bar = '='.repeat(60)
	return `// ${bar}\n// ${title}\n// ${bar}\n\n${content.trim()}\n\n`
}

function collectDir(dir: string): Array<{ rel: string; content: string }> {
	const result: Array<{ rel: string; content: string }> = []
	for (const entry of readdirSync(join(dist, dir), { withFileTypes: true })) {
		if (entry.isDirectory()) {
			result.push(...collectDir(`${dir}/${entry.name}`))
		} else if (entry.name.endsWith('.d.ts')) {
			const rel = `${dir}/${entry.name}`
			result.push({ rel, content: read(rel) })
		}
	}
	return result
}

const parts: string[] = []

// --- builder declarations: the main API surface ---
parts.push(section('@rifted/sdk  —  TypeScript builder API', ''))

for (const { rel, content } of collectDir('builders')) {
	parts.push(`// ${rel}\n${content.trim()}\n`)
}

// --- locales/keys: auto-loc key convention ---
parts.push(section('locales/keys  —  FTL key convention', read('locales/keys.d.ts')))

// --- helpers ---
for (const { rel, content } of collectDir('helpers')) {
	parts.push(`// ${rel}\n${content.trim()}\n`)
}

// --- enums and primitives: small, referenced everywhere ---
parts.push(section('schema/enums', read('schema/enums.d.ts')))
parts.push(section('schema/primitives (Text, NamespacedId, …)', read('schema/primitives.d.ts')))

// --- pack/manifest: what goes in .rmod ---
parts.push(section('pack/manifest  —  .rmod manifest types', read('pack/manifest.d.ts')))

// --- json schema of the gcf wire format ---
parts.push(
	section(
		'GCF JSON Schema  —  wire format (gcf.json)',
		readFileSync(join(dist, 'gcf.schema.json'), 'utf-8'),
	),
)

const out = parts.join('\n')
const outPath = join(dist, 'rifted-sdk-context.txt')
writeFileSync(outPath, out, 'utf-8')

const kb = (Buffer.byteLength(out) / 1024).toFixed(1)
const relOut = relative(root, outPath)
console.log(`${relOut} written (${kb} kB)`)
