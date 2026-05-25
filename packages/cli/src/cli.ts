#!/usr/bin/env node
import { defineCommand, runMain } from 'citty'

import { buildCommand } from './commands/build'
import { initCommand } from './commands/init'
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
	},
})

runMain(main)
