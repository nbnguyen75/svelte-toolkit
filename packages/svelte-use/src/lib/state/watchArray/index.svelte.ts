import { untrack } from 'svelte';

import { type MaybeGetter, resolveGetter } from '../../shared/getter.ts';

export type WatchArrayCallback<T> = (
	value: T[],
	oldValue: T[],
	added: T[],
	removed: T[],
	onCleanup: (cleanup: () => void) => void
) => void;

export interface WatchArrayOptions {
	/**
	 * Fire on mount with `oldValue` and `removed` empty and `added` holding
	 * every item.
	 * @default false
	 */
	immediate?: boolean;
}

/**
 * Watch an array source and report identity-diffed additions and removals.
 *
 * Matching is duplicate-safe: each old item is consumed by at most one new
 * item, so reorderings and repeated values diff correctly. Wraps Svelte's
 * `$effect`; `onCleanup` runs before the next callback, on `stop`, and when
 * the owner unmounts.
 *
 * @param source Array, or a getter over reactive state.
 * @param cb Invoked per change with `(value, oldValue, added, removed, onCleanup)`.
 * @param options See {@link WatchArrayOptions}.
 * @returns Function that stops watching and runs the pending cleanup.
 * @example
 * ```ts
 * const stop = watchArray(() => ids, (value, oldValue, added, removed) => {
 * 	sync(added, removed);
 * });
 * stop();
 * ```
 */
export function watchArray<T>(
	source: MaybeGetter<T[]>,
	cb: WatchArrayCallback<T>,
	options: WatchArrayOptions = {}
): () => void {
	const { immediate = false } = options;

	let oldList: T[] = [];
	let stopped = false;
	let first = true;
	let cleanup: (() => void) | undefined;

	const onCleanup = (fn: () => void): void => {
		cleanup = fn;
	};

	const runCleanup = (): void => {
		const fn = cleanup;
		cleanup = undefined;
		fn?.();
	};

	const stop = (): void => {
		stopped = true;
		runCleanup();
	};

	$effect(() => {
		const newList = resolveGetter(source);

		untrack(() => {
			if (stopped) return;

			if (first) {
				first = false;
				if (!immediate) {
					oldList = [...newList];
					return;
				}
			}

			runCleanup();

			const remains = oldList.map(() => false);
			const added: T[] = [];
			for (const item of newList) {
				let found = false;
				for (let i = 0; i < oldList.length; i += 1) {
					if (!remains[i] && item === oldList[i]) {
						remains[i] = true;
						found = true;
						break;
					}
				}
				if (!found) added.push(item);
			}
			const removed = oldList.filter((_, index) => !remains[index]);

			cb(newList, oldList, added, removed, onCleanup);
			oldList = [...newList];
		});

		return () => {
			runCleanup();
		};
	});

	return stop;
}
