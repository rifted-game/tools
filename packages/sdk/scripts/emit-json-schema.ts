// generates gcf.schema.json from the zod schema definitions.
// the go server reads gcf.json files directly — this schema is for tooling,
// validators, and documentation; not consumed at runtime by the server.

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

// trigger effect + value/condition registration before importing schemas
import '../src/schema/dsl-lazy'
import '../src/schema/value'
import '../src/schema/condition'
import '../src/schema/effect'

import { Condition } from '../src/schema/condition'
import { Effect } from '../src/schema/effect'
import { File } from '../src/schema/file'
import { TextWithVariants } from '../src/schema/text-variants'
import { Value } from '../src/schema/value'

const __dir = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dir, '..', 'dist', 'gcf.schema.json')

mkdirSync(dirname(outPath), { recursive: true })

// name the recursive core schemas so validators and editors show meaningful refs
const reg = z.registry<{ id: string }>()
reg.add(Value, { id: 'value' })
reg.add(Condition, { id: 'condition' })
reg.add(Effect as z.ZodType, { id: 'effect' })
reg.add(TextWithVariants, { id: 'text_variants' })

const jsonSchema = z.toJSONSchema(File, {
	metadata: reg,
	target: 'draft-7',
})

// z.refine() is not representable in JSON Schema — patch the "at least one
// content section" constraint that the runtime refine enforces at parse time
const contentSections = [
	'assets',
	'cards',
	'buffs',
	'relics',
	'enemies',
	'summons',
	'encounters',
	'locations',
	'match_modes',
]
const patched = {
	$schema: 'http://json-schema.org/draft-07/schema#',
	...jsonSchema,
	anyOf: contentSections.map(k => ({ required: [k] })),
}

const output = { title: 'Rifted Game Content File', ...patched }

writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8')

const kb = (Buffer.byteLength(JSON.stringify(output)) / 1024).toFixed(1)
console.log(`gcf.schema.json written (${kb} kB)`)
