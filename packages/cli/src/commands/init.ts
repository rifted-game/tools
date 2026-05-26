import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { cancel, isCancel, select } from '@clack/prompts'
import { defineCommand } from 'citty'
import pc from 'picocolors'

type IdeChoice = 'vscode' | 'idea' | 'none'

// ------------------------------------------------------------
// mod template
// ------------------------------------------------------------

const MOD_TEMPLATE = `import { File, Locale, Pkg } from '@rifted/sdk'

const pkg = Pkg('my_mod')

export default File({
	package: {
		namespace: 'my_mod',
		version: '0.1.0',
		name: 'My Mod',
		author: 'you',
		riftedVersion: '>=0.5.0',
	},

	locales: [
		Locale({ lang: 'en', path: 'locales/en.ftl' }),
	],

	cards: [
		pkg.Card({
			id: 'example',
			affinity: 'neutral',
			rarity: 'common',
			baseCooldown: 3,
			scaleType: 'linear',
			params: { base: 10 },
			// name and description come from locales/en.ftl as
			// my_mod-card-example.name / my_mod-card-example.description.
			// params are available as ftl variables: { $base }
			// run 'rifted locales:scaffold --lang en' to generate stubs
		}),
	],
})
`

const STARTER_FTL = `# my_mod english strings

my_mod-card-example = Example Card
    .description = Deal { $base } damage.
`

// ------------------------------------------------------------
// config files
// ------------------------------------------------------------

const TSCONFIG_TEMPLATE = `{
	"extends": "@rifted/sdk/tsconfig.mod.json",
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
		"dev": "rifted build --watch",
		"build": "rifted build",
		"validate": "rifted validate",
		"pack": "rifted build && rifted pack",
		"scaffold": "rifted build && rifted locales:scaffold --lang en",
		"format": "biome format --write ."
	},
	"dependencies": {
		"@rifted/sdk": "link:@rifted/sdk"
	},
	"devDependencies": {
		"@biomejs/biome": "^2.4.15"
	}
}
`

const BIOME_TEMPLATE = `{
	"$schema": "https://biomejs.dev/schemas/2.4.15/schema.json",
	"files": {
		"ignoreUnknown": true
	},
	"formatter": {
		"enabled": true,
		"indentStyle": "tab",
		"lineWidth": 100
	},
	"linter": {
		"enabled": true,
		"rules": {
			"recommended": true,
			"suspicious": {
				"noConsole": "off",
				"noExplicitAny": "off",
				"noImplicitAnyLet": "off",
				"noThenProperty": "off"
			},
			"style": {
				"useConst": "error",
				"noNonNullAssertion": "off"
			},
			"correctness": {
				"noUnusedVariables": "off"
			}
		}
	},
	"javascript": {
		"formatter": {
			"bracketSpacing": true,
			"quoteStyle": "single",
			"semicolons": "asNeeded",
			"arrowParentheses": "asNeeded"
		}
	},
	"assist": {
		"enabled": true,
		"actions": {
			"source": {
				"organizeImports": {
					"level": "on"
				}
			}
		}
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

// ------------------------------------------------------------
// IDE-specific configs
// ------------------------------------------------------------

const VSCODE_SETTINGS = `{
	"editor.defaultFormatter": "biomejs.biome",
	"editor.formatOnSave": true,
	"editor.codeActionsOnSave": {
		"source.organizeImports.biome": "explicit"
	}
}
`

const VSCODE_EXTENSIONS = `{
	"recommendations": ["biomejs.biome"]
}
`

// Disables the "unused global symbol" inspection for mod entry points
// (export default File({...}) is consumed by the engine, not by other TS files)
const IDEA_INSPECTION_PROFILE = `<component name="InspectionProjectProfileManager">
  <profile version="1.0">
    <option name="myName" value="Project Default" />
    <inspection_tool class="JSUnusedGlobalSymbols" enabled="false" level="WARNING" enabled_by_default="false" />
  </profile>
</component>
`

const gitignore = (ide: IdeChoice) => {
	const ideLines = ide === 'idea' ? `.idea/\n!.idea/inspectionProfiles/` : `.idea/`
	return `node_modules/\ndist/\n${ideLines}\n`
}

// ------------------------------------------------------------
// command
// ------------------------------------------------------------

export const initCommand = defineCommand({
	meta: {
		name: 'init',
		description: 'Scaffold a new Rifted mod',
	},
	args: {
		name: {
			type: 'positional',
			description: 'Mod folder name (default: rifted-mod)',
			required: false,
			default: 'rifted-mod',
		},
		ide: {
			type: 'string',
			description: 'Skip prompt: vscode | idea | none',
		},
	},
	async run({ args }) {
		const targetDir = join(process.cwd(), args.name)

		if (existsSync(targetDir)) {
			console.error(pc.red(`Directory "${args.name}" already exists`))
			process.exit(1)
		}

		// resolve IDE choice — flag skips the prompt (useful in CI / scripts)
		let ide: IdeChoice
		if (args.ide === 'vscode' || args.ide === 'idea' || args.ide === 'none') {
			ide = args.ide
		} else {
			const answer = await select({
				message: 'Which IDE are you using?',
				options: [
					{ value: 'vscode', label: 'VS Code' },
					{ value: 'idea', label: 'JetBrains (WebStorm / IntelliJ)' },
					{ value: 'none', label: 'None / Other' },
				],
			})
			if (isCancel(answer)) {
				cancel('Cancelled')
				process.exit(0)
			}
			ide = answer as IdeChoice
		}

		// create directory structure
		mkdirSync(join(targetDir, 'src'), { recursive: true })
		mkdirSync(join(targetDir, 'assets'), { recursive: true })
		mkdirSync(join(targetDir, 'locales'), { recursive: true })

		// common files
		writeFileSync(join(targetDir, 'src', 'index.ts'), MOD_TEMPLATE)
		writeFileSync(join(targetDir, 'locales', 'en.ftl'), STARTER_FTL)
		writeFileSync(join(targetDir, 'tsconfig.json'), TSCONFIG_TEMPLATE)
		writeFileSync(join(targetDir, 'package.json'), PACKAGE_JSON_TEMPLATE(args.name))
		writeFileSync(join(targetDir, 'biome.json'), BIOME_TEMPLATE)
		writeFileSync(join(targetDir, '.editorconfig'), EDITORCONFIG_TEMPLATE)
		writeFileSync(join(targetDir, '.gitignore'), gitignore(ide))

		// IDE-specific files
		if (ide === 'vscode') {
			mkdirSync(join(targetDir, '.vscode'), { recursive: true })
			writeFileSync(join(targetDir, '.vscode', 'settings.json'), VSCODE_SETTINGS)
			writeFileSync(join(targetDir, '.vscode', 'extensions.json'), VSCODE_EXTENSIONS)
		} else if (ide === 'idea') {
			mkdirSync(join(targetDir, '.idea', 'inspectionProfiles'), { recursive: true })
			writeFileSync(
				join(targetDir, '.idea', 'inspectionProfiles', 'Project_Default.xml'),
				IDEA_INSPECTION_PROFILE,
			)
		}

		console.log(`\n${pc.green('✓')} Created ${pc.bold(args.name)}`)
		console.log(`  ${pc.dim('src/index.ts')}       mod entry point`)
		console.log(`  ${pc.dim('locales/en.ftl')}    starter strings`)
		console.log(`  ${pc.dim('assets/')}           sprites and sounds`)
		console.log(`  ${pc.dim('biome.json')}        formatter config`)
		console.log('')
		console.log('Next steps:')
		console.log(`  cd ${args.name} && bun install`)
		console.log(`  bun dev   ${pc.dim('# or: rifted build --watch')}`)
		console.log('  rifted pack')
	},
})
