import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineCommand } from 'citty'
import pc from 'picocolors'

const MOD_CONFIG_TEMPLATE = `import { File, Card, Pkg } from '@rifted/sdk'

// replace 'my_mod' with your mod's unique namespace
const pkg = Pkg('my_mod')

export default File({
  package: {
    namespace: 'my_mod',
    version: '0.1.0',
    author: 'you',
  },
  cards: [
    pkg.Card({
      id: 'example',
      affinity: 'neutral',
      rarity: 'common',
      baseCooldown: 3,
      scaleType: 'linear',
      params: { base: 10 },
      name: 'Example Card',
      description: 'Deals {base} damage.',
    }),
  ],
})
`

const TSCONFIG_TEMPLATE = `{
  "extends": "@rifted/sdk/tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src"]
}
`

const PACKAGE_JSON_TEMPLATE = (name: string) => `{
  "name": "${name}",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build": "rifted build",
    "validate": "rifted validate"
  },
  "dependencies": {
    "@rifted/sdk": "link:@rifted/sdk"
  }
}
`

const EDITORCONFIG_TEMPLATE = `root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = tab
indent_size = 4
max_line_length = 100
trim_trailing_whitespace = true

[*.{js,ts,json}]
quote_type = single
`

export const initCommand = defineCommand({
	meta: {
		name: 'init',
		description: 'Scaffold a new Rifted mod in the current directory',
	},
	args: {
		name: {
			type: 'positional',
			description: 'Mod folder name (default: rifted-mod)',
			required: false,
			default: 'rifted-mod',
		},
	},
	run({ args }) {
		const targetDir = join(process.cwd(), args.name)

		if (existsSync(targetDir)) {
			console.error(pc.red(`Directory "${args.name}" already exists`))
			process.exit(1)
		}

		mkdirSync(join(targetDir, 'src'), { recursive: true })

		writeFileSync(join(targetDir, 'src', 'mod.ts'), MOD_CONFIG_TEMPLATE)
		writeFileSync(join(targetDir, 'tsconfig.json'), TSCONFIG_TEMPLATE)
		writeFileSync(join(targetDir, 'package.json'), PACKAGE_JSON_TEMPLATE(args.name))
		writeFileSync(join(targetDir, '.editorconfig'), EDITORCONFIG_TEMPLATE)

		console.log(`${pc.green('✓')} Created ${pc.bold(args.name)}`)
		console.log(`  ${pc.dim('src/mod.ts')}   — your mod entry point`)
		console.log(`  ${pc.dim('tsconfig.json')} — TypeScript config`)
		console.log(`  ${pc.dim('package.json')}  — package manifest`)
		console.log(`  ${pc.dim('.editorconfig')} — Editor settings`)
		console.log('')
		console.log('Next steps:')
		console.log(`  cd ${args.name}`)
		console.log('  bun install')
		console.log('  rifted build')
	},
})
