// References to definitions. Inside a package, builders return Ref objects —
// link by reference (rename refactoring, typos die in TS); strings stay legal
// for cross-namespace references ("core:burn")

import { RiftedBuildError } from './scope'

export type RefKind = 'card' | 'modifier' | 'enemy' | 'watcher' | 'encounter' | 'map' | 'affinity'

export interface Ref<K extends RefKind = RefKind> {
	readonly kind: K
	/** id inside the document (no namespace prefix) */
	readonly id: string
}

export type RefLike<K extends RefKind> = Ref<K> | string

export function makeRef<K extends RefKind>(kind: K, id: string): Ref<K> {
	return Object.freeze({ kind, id })
}

export function refId<K extends RefKind>(x: RefLike<K>, expect: K): string {
	if (typeof x === 'string') {
		if (x === '') throw new RiftedBuildError(`empty ${expect} reference`)
		return x
	}
	if (x.kind !== expect) {
		throw new RiftedBuildError(`expected a ${expect} reference, got ${x.kind} "${x.id}"`)
	}
	return x.id
}

export const ID_RE = /^[a-z0-9_]+$/

export function assertIdent(id: string, what: string): void {
	if (!ID_RE.test(id)) {
		throw new RiftedBuildError(
			`${what} "${id}": ids must match [a-z0-9_]+ (namespace is added by the loader)`,
		)
	}
}
