import type { MaybeGetter } from '../../shared/getter.ts';

import { untrack } from 'svelte';

import { resolveGetter } from '../../shared/getter.ts';

/**
 * Plain projection of `T`: what `$state.snapshot` hands back after unwrapping
 * reactive proxies. For plain data this resolves to `T` itself, which is why
 * {@link useCloned} exposes it instead of asserting a snapshot back to `T`.
 */
export type ClonedSnapshot<T> = ReturnType<typeof defaultClone<T>>;

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
 * `structuredClone` over `$state.snapshot(source)` (the snapshot is required
 * because `structuredClone` cannot read a reactive proxy).
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

/** `structuredClone` cannot read a reactive proxy, so unwrap first. */
function defaultClone<T>(source: T) {
	return structuredClone($state.snapshot(source));
}
