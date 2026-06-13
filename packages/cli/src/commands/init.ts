import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { cancel, isCancel, select } from '@clack/prompts'
import { defineCommand } from 'citty'
import pc from 'picocolors'

type IdeChoice = 'vscode' | 'idea' | 'none'

// ------------------------------------------------------------
// mod template — the canonical layout:
//   src/pkg.ts        the package identity, nothing else
//   src/state.ts      handles: run state + custom events (pure values)
//   src/content/      content() composers, one per file/folder
//   src/index.ts      composition root: pkg.use(...) only
// ------------------------------------------------------------

const PKG_TEMPLATE = `// The package identity. Nothing else lives here, so importing it from any
// file is side-effect-free.

import { Pkg } from '@rifted/sdk'

export const pkg = Pkg('__NS__', {
	version: 1,
	name: 'My Mod',
	semver: '0.1.0',
	authors: ['you'],
	defaultLocale: 'en',
	// depend on other mods to reference their content ("vanilla:berserk"):
	// requires: { vanilla: 1 },
})
`

const STATE_TEMPLATE = `// Global handles: run state and custom events. Handles are pure values
// (typed keys, no registration) — import them from any content file.

import { pkg } from './pkg'

export const fury = pkg.playerState('fury')
export const bloodSpilled = pkg.event('blood_spilled', { amount: 0 })
`

const CORE_TEMPLATE = `// Shared definitions many files reference. Definitions belong to a
// composer (unlike handles) — this one mounts first.

import { content } from '@rifted/sdk'

export const core = content()

export const reaver = core.affinity('reaver', {
	name: 'Reaver',
	art: { color: '#aa2222' },
})
`

const CARDS_INDEX_TEMPLATE = `import { content } from '@rifted/sdk'

import { attack } from './attack'

// the folder aggregator: a composer that mounts its files
export const cards = content()
cards.use(attack)
`

const CARDS_ATTACK_TEMPLATE = `import { addStack, content, dmg, rand, selfDmg, when } from '@rifted/sdk'

import { reaver } from '../core'
import { bloodSpilled, fury } from '../../state'

export const attack = content()

// name/description compile into locales/*.ftl, never into gcf.json.
// render bindings become fluent variables: { $dmg } in the description.
// Refs are plain exports — import { strike } from this file anywhere.
export const strike = attack.card('strike', {
	name: 'Strike',
	description: 'Deal { $dmg } damage and gain 1 fury.',
	cooldown: 1,
	scale: 'flat',
	tags: ['attack'],
	affinity: reaver,
	params: { base: 6 },
	render: ({ params }) => ({ dmg: params.base.scaled() }),
	art: { icon: 'assets/cards/strike.png' },
	onPlay({ params }) {
		dmg('selected', params.base)
		fury.inc(1)
		bloodSpilled.emit({ amount: params.base })
	},
})

attack.card('gamble', {
	name: { en: 'Gamble', ru: 'Авантюра' },
	description: 'Roll a die. High: spend 2 fury to strike hard. Low: bleed.',
	cooldown: 2,
	scale: 'hyp',
	tags: ['attack'],
	params: { base: 4 },
	onPlay({ params }) {
		const roll = rand(1, 6).as('roll')
		when(roll.gt(3).and(fury.spend(2)), () => {
			dmg('weakest_enemy', params.base.scaled().mul(roll))
			addStack(1)
		}).otherwise(() => {
			selfDmg(roll.div(2).ceil())
		})
	},
})
`

const WORLD_TEMPLATE = `// Enemies, encounters, the map — the run's world.

import { content, intent, phase } from '@rifted/sdk'

import { strike } from './cards/attack'

export const world = content()

export const goblin = world.enemy('goblin', {
	name: 'Goblin',
	hp: 16,
	phases: [phase({ steps: [intent.attack(4)] })],
})

const goblinFight = world.encounter('goblin_fight', {
	enemies: [goblin],
	loot: { pool: [strike], offer: 1, picks: 1 },
})

world.map('act1', {
	name: 'Act I',
	floors: 6,
	width: 5,
	paths: 5,
	fanout: 3,
	rules: {
		combat: { weight: 60 },
		rest: { weight: 10, minFloor: 2, noAdjacent: true },
		elite: { weight: 12, minFloor: 2, noAdjacent: true },
	},
	forceFloors: { [-1]: 'rest' },
	content: { combat: [goblinFight] },
	tethers: { pairwise: { chance: 0.8, min: 1, minFloor: 2 }, anchor: 'boss' },
})
`

const ENTRY_TEMPLATE = `// Composition root: mount order = document order. Nothing is defined here.

import { cards } from './content/cards'
import { core } from './content/core'
import { world } from './content/world'
import { pkg } from './pkg'

pkg.use(core, cards, world)

export default pkg
`

const STARTER_FTL = `# Hand-written strings live here and always win over generated ones.
# Run \`rifted locales:scaffold --lang <locale>\` to append stubs for
# anything still untranslated.
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
		"validate": "rifted build && rifted validate",
		"pack": "rifted pack",
		"scaffold": "rifted locales:scaffold --lang en",
		"format": "biome format --write ."
	},
	"dependencies": {
		"@rifted/sdk": "^1.0.0"
	},
	"devDependencies": {
		"@biomejs/biome": "^2.4.15",
		"@rifted/cli": "^1.0.0"
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

# fluent files must use spaces - the parser rejects tab indentation
[*.ftl]
indent_style = space
indent_size = 4
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
// (export default pkg is consumed by the CLI, not by other TS files)
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

		// resolve IDE choice - flag skips the prompt (useful in CI / scripts)
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

		// gcf namespace from the folder name: [a-z0-9_]+
		const ns =
			args.name
				.toLowerCase()
				.replace(/[^a-z0-9_]+/g, '_')
				.replace(/^_+|_+$/g, '') || 'my_mod'

		// create directory structure
		mkdirSync(join(targetDir, 'src', 'content', 'cards'), { recursive: true })
		mkdirSync(join(targetDir, 'assets'), { recursive: true })
		mkdirSync(join(targetDir, 'locales'), { recursive: true })

		// sources
		const src = (...p: string[]) => join(targetDir, 'src', ...p)
		writeFileSync(src('pkg.ts'), PKG_TEMPLATE.replaceAll('__NS__', ns))
		writeFileSync(src('state.ts'), STATE_TEMPLATE)
		writeFileSync(src('content', 'core.ts'), CORE_TEMPLATE)
		writeFileSync(src('content', 'cards', 'attack.ts'), CARDS_ATTACK_TEMPLATE)
		writeFileSync(src('content', 'cards', 'index.ts'), CARDS_INDEX_TEMPLATE)
		writeFileSync(src('content', 'world.ts'), WORLD_TEMPLATE)
		writeFileSync(src('index.ts'), ENTRY_TEMPLATE)

		// config files
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

		console.log(`\n${pc.green('✓')} Created ${pc.bold(args.name)} ${pc.dim(`(namespace "${ns}")`)}`)
		console.log(`  ${pc.dim('src/pkg.ts')}        package identity`)
		console.log(`  ${pc.dim('src/state.ts')}      run state + custom events (pure handles)`)
		console.log(`  ${pc.dim('src/content/')}      content() composers: core, cards/, world`)
		console.log(`  ${pc.dim('src/index.ts')}      composition root (pkg.use)`)
		console.log(`  ${pc.dim('locales/en.ftl')}    hand-written strings (win over generated)`)
		console.log(`  ${pc.dim('assets/')}           sprites and sounds (hashed into .rmod)`)
		console.log('')
		console.log('Next steps:')
		console.log(`  cd ${args.name} && bun install`)
		console.log(`  bun dev   ${pc.dim('# or: rifted build --watch')}`)
		console.log('  rifted pack')
	},
})
