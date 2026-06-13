// Emits dist/gcf.schema.json (JSON Schema 2020-12) from the zod document
// schema. The engine never reads it — it is for editors, validators and docs

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { toJsonSchema } from '../src/schema/index'

const __dir = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dir, '..', 'dist', 'gcf.schema.json')

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, `${JSON.stringify(toJsonSchema(), null, 2)}\n`)
console.log(`✓ ${outPath}`)
