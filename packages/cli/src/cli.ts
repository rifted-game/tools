#!/usr/bin/env node
import { defineCommand, runMain } from 'citty'

import { buildCommand } from './commands/build'
import { diffCommand } from './commands/diff'
import { initCommand } from './commands/init'
import { inspectCommand } from './commands/inspect'
import { localesCheckCommand } from './commands/locales-check'
import { localesScaffoldCommand } from './commands/locales-scaffold'
import { packCommand } from './commands/pack'
import { typegenCommand } from './commands/typegen'
import { validateCommand } from './commands/validate'

const main = defineCommand({
	meta: {
		name: 'rifted',
		version: '1.0.0',
		description: 'Build tools for Rifted mods',
	},
	subCommands: {
		init: initCommand,
		build: buildCommand,
		validate: validateCommand,
		pack: packCommand,
		inspect: inspectCommand,
		diff: diffCommand,
		typegen: typegenCommand,
		'locales:scaffold': localesScaffoldCommand,
		'locales:check': localesCheckCommand,
	},
})

runMain(main)
