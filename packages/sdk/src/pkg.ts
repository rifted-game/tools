import type { BuffOpts } from './builders/buff'
import { Buff } from './builders/buff'
import type { CardOpts } from './builders/card'
import { Card } from './builders/card'
import { AddRunState, SetRunState } from './builders/effect/run'
import type { EncounterOpts } from './builders/encounter'
import { Encounter } from './builders/encounter'
import type { EnemyOpts } from './builders/enemy'
import { Enemy } from './builders/enemy'
import { File as FileBuilder, type FileOpts, type PackageOpts } from './builders/file'
import type { LocationOpts } from './builders/location'
import { Location } from './builders/location'
import type { MatchModeOpts } from './builders/match-mode'
import { MatchMode } from './builders/match-mode'
import type { RelicOpts } from './builders/relic'
import { Relic } from './builders/relic'
import type { SummonOpts } from './builders/summon'
import { Summon } from './builders/summon'
import { Get } from './builders/value'
import { type Expr, wrapExpr } from './helpers/expr'
import type { StateInitInput } from './helpers/state'
import type { Effect } from './schema/effect'
import type { Value } from './schema/value'

export interface PkgOpts<K extends string = string> {
	/**
	 * Run-state keys this mod owns. Declaring them turns `pkg.key`,
	 * `pkg.state.set/add/read` and `pkg.initialRunState` into typed,
	 * namespace-aware accessors so a key is spelled once and the `ns:` prefix is
	 * never written by hand.
	 *
	 * Non-zero defaults: pass `pkg.initialRunState({...})` to `File`. Unset keys
	 * already read as 0, so the registry is needed only for non-zero seeds.
	 */
	state?: readonly K[]
}

// Pkg(ns) returns builders that auto-prefix ids with the mod namespace.
// ids already containing a colon are kept verbatim (for vanilla references).
// Pass { state: [...] } to get typed run-state accessors keyed to your mod.

export function Pkg<const K extends string = string>(ns: string, _opts?: PkgOpts<K>) {
	const prefix = (name: string): string => (name.includes(':') ? name : `${ns}:${name}`)
	// run-state keys are bare in source; the mod namespace is applied here
	const key = (k: K): string => `${ns}:${k}`
	return {
		ns,
		id: prefix,
		/** namespaced run-state key, e.g. `pkg.key('rage')` → `'my_mod:rage'` */
		key,
		/** typed run-state accessors — the `ns:` prefix is applied automatically */
		state: {
			/** set a run-state field to an exact value */
			set: (k: K, value: Value): Effect => SetRunState({ key: key(k), value }),
			/** atomically add to a run-state field */
			add: (k: K, value: Value): Effect => AddRunState({ key: key(k), value }),
			/** read a run-state field as an Expr */
			read: (k: K): Expr => wrapExpr(Get(`run.state.${key(k)}`)),
		},
		/**
		 * Build a namespaced `initial_run_state` map for `File({ initialRunState })`.
		 * The engine seeds these when a run begins; only list keys that need a
		 * non-zero default (unset keys already read as 0).
		 *
		 * ```ts
		 * File({ initialRunState: pkg.initialRunState({ curse_charge: 5 }) })
		 * ```
		 */
		initialRunState: (defaults: Partial<Record<K, number>>): Record<string, number> => {
			const out: Record<string, number> = {}
			for (const [k, v] of Object.entries(defaults)) {
				if (v !== undefined) out[key(k as K)] = v as number
			}
			return out
		},
		/**
		 * Build the root File with `package.namespace` already set to this mod's ns.
		 * The namespace cannot be passed in — it comes from `Pkg(ns)`, so a mismatch
		 * between `Pkg('foo')` and `package.namespace: 'bar'` is impossible by type.
		 */
		File: (opts: Omit<FileOpts, 'package'> & { package: Omit<PackageOpts, 'namespace'> }) =>
			FileBuilder({
				...opts,
				package: { ...opts.package, namespace: ns },
			} as FileOpts),
		Card: <
			P extends Record<string, number> = Record<string, number>,
			const S extends Record<string, StateInitInput> = Record<string, StateInitInput>,
		>(
			o: CardOpts<P, S>,
		) => Card<P, S>({ ...o, id: prefix(o.id) }),
		Buff: (o: BuffOpts) => Buff({ ...o }),
		Relic: (o: RelicOpts) => Relic({ ...o, id: prefix(o.id) }),
		Enemy: (o: EnemyOpts) => Enemy({ ...o, id: prefix(o.id) }),
		Summon: (o: SummonOpts) => Summon({ ...o, id: prefix(o.id) }),
		Encounter: (o: EncounterOpts) => Encounter({ ...o, id: prefix(o.id) }),
		Location: (o: LocationOpts) => Location({ ...o, id: prefix(o.id) }),
		MatchMode: (o: MatchModeOpts) => MatchMode({ ...o, id: prefix(o.id) }),
	}
}

export type PkgBuilder = ReturnType<typeof Pkg>
