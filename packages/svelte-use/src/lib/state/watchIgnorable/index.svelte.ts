import { untrack } from 'svelte';

import { type MaybeGetter, resolveGetter } from '../../shared/getter.ts';

export type IgnoredUpdater = <R>(updater: () => R) => R;

export interface WatchIgnorableOptions {
	/**
	 * Run the callback once on mount, before any change.
	 * @default false
	 */
	immediate?: boolean;
}

export interface WatchIgnorableReturn {
	/**
	 * Drop the next source change, e.g. one already scheduled by a previous
	 * write.
	 */
	ignorePrevAsyncUpdates: () => void;
	/**
	 * Run `updater` without triggering the watch callback for the change it
	 * produces. Returns whatever `updater` returns.
	 */
	ignoreUpdates: IgnoredUpdater;
	/**
	 * Stop watching permanently and run the pending cleanup.
	 */
	stop: () => void;
}

/**
 * Watch a reactive source and expose controls to suppress individual updates.
 *
 * Wraps Svelte's `$effect`: the callback receives `(value, oldValue, onCleanup)`
 * and effects run in a batch after the writes that triggered them. `onCleanup`
 * runs before the next callback, on `stop`, and when the owner unmounts.
 *
 * @param source Reactive source: a value or a getter over reactive state.
 * @param cb Called on each change with the new value, previous value and cleanup registrar.
 * @param options See {@link WatchIgnorableOptions}.
 * @returns Controls to ignore updates and stop watching.
 * @example
 * ```ts
 * const { ignoreUpdates, stop } = watchIgnorable(count, (value) => save(value));
 * ignoreUpdates(() => { count += 1; }); // does not call save
 * stop();
 * ```
 */
export function watchIgnorable<T>(
	source: MaybeGetter<T>,
	cb: (value: T, oldValue: T | undefined, onCleanup: (cleanup: () => void) => void) => void,
	options: WatchIgnorableOptions = {}
): WatchIgnorableReturn {
	const { immediate = false } = options;

	let stopped = false;
	let first = true;
	let ignoreNext = false;
	let lastSeen: T | undefined;
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

	const ignoreUpdates: IgnoredUpdater = <R>(updater: () => R): R => {
		const result = updater();
		// The write is batched, so the effect runs later. Sync the seen value
		// now: the upcoming run then finds no change and stays silent, and a
		// no-op updater cannot leave a stale "skip" flag behind.
		lastSeen = resolveGetter(source);
		return result;
	};

	const ignorePrevAsyncUpdates = (): void => {
		ignoreNext = true;
	};

	$effect(() => {
		const value = resolveGetter(source);

		untrack(() => {
			if (stopped) return;

			if (first) {
				first = false;
				lastSeen = value;
				if (!immediate) return;
				runCleanup();
				cb(value, undefined, onCleanup);
				return;
			}

			if (ignoreNext) {
				ignoreNext = false;
				lastSeen = value;
				return;
			}

			if (Object.is(value, lastSeen)) return;

			const oldValue = lastSeen;
			lastSeen = value;
			runCleanup();
			cb(value, oldValue, onCleanup);
		});

		return () => {
			runCleanup();
		};
	});

	return { ignoreUpdates, ignorePrevAsyncUpdates, stop };
}
