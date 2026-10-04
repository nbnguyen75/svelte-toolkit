import type { MaybeGetter } from '../../shared/getter.ts';

import { untrack } from 'svelte';

import { resolveGetter } from '../../shared/getter.ts';

/**
 * Plain projection of `T`: what the clone hands back, after `$state.snapshot`
 * unwraps any reactive proxy. Kept as its own name because it appears in
 * {@link UseClonedOptions} and {@link UseClonedReturn}, and because it documents
 * intent at the call site.
 *
 * Plain `T`, deliberately: Svelte's own snapshot type is not importable, and
 * every spelling that pulls it into this position breaks the published build.
 * See the note on `defaultClone` below.
 */
export type ClonedSnapshot<T> = T;

/** Options for {@link useCloned}. */
export interface UseClonedOptions<T> {
	/**
	 * Custom clone implementation.
	 * @default `$state.snapshot` + `structuredClone`
	 */
	clone?: (source: T) => ClonedSnapshot<T>;
	/**
	 * Only sync via `sync()`; ignore source changes.
	 * @default false
	 */
	manual?: boolean;
}

/** Cloned state returned by {@link useCloned}. */
export interface UseClonedReturn<T> {
	/** Whether the clone was edited since the last sync. Getter-backed. */
	readonly isModified: boolean;
	/** Re-clone from the source and clear `isModified`. */
	sync: () => void;
	/** Editable clone of the source. Getter/setter-backed (destructure-safe). */
	value: T;
}

/**
 * Clone `source` into independently editable state, tracking whether it was
 * modified.
 *
 * The source must be structured-cloneable: the default clone runs
 * `structuredClone` over `$state.snapshot(source)`, and the snapshot is required
 * because `structuredClone` cannot read a reactive proxy.
 *
 * @param source Reactive source: a value or a getter over reactive state.
 * @param options `clone` implementation and `manual` sync mode.
 * @returns `value` / `isModified` / `sync`.
 * @example
 * ```ts
 * const form = useCloned(() => original);
 * form.value.name = 'edited';
 * form.isModified; // true
 * form.sync(); // discard edits
 * ```
 */
export function useCloned<T>(
	source: MaybeGetter<T>,
	options: UseClonedOptions<T> = {}
): UseClonedReturn<ClonedSnapshot<T>> {
	const { clone = defaultClone, manual = false } = options;

	let cloned = $state<ClonedSnapshot<T>>(clone(resolveGetter(source)));
	let isModified = $state(false);
	let suppressDirty = false;
	let pristine = true;

	function sync(): void {
		suppressDirty = true;
		isModified = false;
		cloned = clone(resolveGetter(source));
	}

	if (!manual) {
		let firstSourceRun = true;
		$effect(() => {
			// Snapshot as a bare read so nested source edits re-run this effect.
			$state.snapshot(resolveGetter(source));
			untrack(() => {
				// Already synced at setup; every later run is a real change.
				if (firstSourceRun) {
					firstSourceRun = false;
					return;
				}
				sync();
			});
		});
	}

	$effect(() => {
		// Snapshot as a bare read so every nested edit re-runs this effect.
		$state.snapshot(cloned);
		untrack(() => {
			if (pristine) {
				pristine = false;
				return;
			}
			if (suppressDirty) {
				suppressDirty = false;
				return;
			}
			isModified = true;
		});
	});

	return {
		get value() {
			return cloned;
		},
		set value(next: ClonedSnapshot<T>) {
			cloned = next;
		},
		get isModified() {
			return isModified;
		},
		sync
	};
}

/**
 * `structuredClone` cannot read a reactive proxy, so unwrap with
 * `$state.snapshot` first.
 *
 * `$state.snapshot` returns Svelte's own snapshot type, which is declared in
 * `svelte/types/compiler/interfaces` and so cannot be imported from `svelte`.
 * That leaves the cast below as the only way to express "Svelte's snapshot of
 * structured-cloneable data is that data". It is sound for this util's
 * documented input, and `structuredClone<T>(value: T): T` is identity-typed, so
 * the runtime result really is `T`.
 *
 * The alternatives all shipped broken, and none of them were caught by
 * `svelte-check` or `publint`, both of which report success:
 *
 * - letting this function infer its return, or writing
 *   `ClonedSnapshot<T> = ReturnType<typeof defaultClone<T>>`, makes TS serialize
 *   Svelte's recursive conditional and fail with **TS7056**, which silently
 *   suppresses the `.d.ts` for this whole module.
 * - `ClonedSnapshot<T> = ReturnType<typeof $state.snapshot<T>>` serializes fine
 *   but ships a rune in the public types, and a consumer has no `$state` in
 *   scope, so every import failed with TS2304.
 *
 * Keeping the snapshot *out* of the type surface is also not an option: dropping
 * it and cloning the proxy directly throws `DataCloneError`.
 */
function defaultClone<T>(source: T): T {
	// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Svelte's snapshot type is unnameable and unserializable; see above. Sound for structured-cloneable input.
	return structuredClone($state.snapshot(source)) as T;
}
