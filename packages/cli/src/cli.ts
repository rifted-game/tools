#!/usr/bin/env node
import { defineCommand, runMain } from 'citty'

import { buildCommand } from './commands/build'
import { initCommand } from './commands/init'
import { inspectCommand } from './commands/inspect'
import { localesListCommand } from './commands/locales-list'
import { localesScaffoldCommand } from './commands/locales-scaffold'
import { packCommand } from './commands/pack'
import { validateCommand } from './commands/validate'

const main = defineCommand({
	meta: {
		name: 'rifted',
		version: '0.1.0',
		description: 'Build tools for Rifted mods',
	},
	subCommands: {
		init: initCommand,
		build: buildCommand,
		validate: validateCommand,
		pack: packCommand,
		inspect: inspectCommand,
		'locales:scaffold': localesScaffoldCommand,
		'locales:list': localesListCommand,
	},
})

runMain(main)
