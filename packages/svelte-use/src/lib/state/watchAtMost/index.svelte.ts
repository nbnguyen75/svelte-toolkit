import { untrack } from 'svelte';

import { type MaybeGetter, resolveGetter } from '../../shared/getter.ts';

export interface WatchAtMostOptions {
	/**
	 * Maximum number of callback invocations before auto-stop. A getter is
	 * re-resolved on every fire, so the limit can change.
	 */
	count: MaybeGetter<number>;
	/**
	 * Fire on mount; counts as the first invocation.
	 * @default false
	 */
	immediate?: boolean;
}

export interface WatchAtMostReturn {
	/**
	 * Invocations so far. Getter-backed, so it stays live when destructured.
	 */
	readonly calls: number;
	/**
	 * Resume notifications. Changes made while paused are dropped.
	 */
	resume: () => void;
	/**
	 * Suspend notifications.
	 */
	pause: () => void;
	/**
	 * Stop watching permanently.
	 */
	stop: () => void;
}

/**
 * Watch a reactive source for at most `count` invocations.
 *
 * Wraps Svelte's `$effect`. Once the callback has run `count` times the watcher
 * stops itself; `pause`/`resume` suspend and restart it without catching up on
 * changes missed while paused.
 *
 * @param source Reactive source: a value or a getter over reactive state.
 * @param cb Called on each change with `(value, oldValue, onCleanup)`.
 * @param options See {@link WatchAtMostOptions}.
 * @returns Controls to read the call count, pause, resume and stop.
 * @example
 * ```ts
 * watchAtMost(() => draft, (value) => save(value), { count: 5 });
 * // saves the first five edits, then stops
 * ```
 */
export function watchAtMost<T>(
	source: MaybeGetter<T>,
	cb: (value: T, oldValue: T | undefined, onCleanup: (cleanup: () => void) => void) => void,
	options: WatchAtMostOptions
): WatchAtMostReturn {
	const { immediate = false } = options;

	let calls = $state(0);
	let active = $state(true);
	let stopped = false;
	let first = true;
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
	};

	const pause = (): void => {
		active = false;
	};

	const resume = (): void => {
		active = true;
	};

	$effect(() => {
		const value = resolveGetter(source);
		const isActive = active;

		untrack(() => {
			if (stopped) return;

			const isFirstRun = first;
			first = false;

			if (!isActive) {
				lastSeen = value;
				return;
			}

			if (isFirstRun && !immediate) {
				lastSeen = value;
				return;
			}

			if (!isFirstRun && Object.is(value, lastSeen)) return;

			const oldValue = isFirstRun ? undefined : lastSeen;
			lastSeen = value;
			runCleanup();
			calls += 1;
			if (calls >= resolveGetter(options.count)) stopped = true;
			cb(value, oldValue, onCleanup);
		});

		return () => {
			runCleanup();
		};
	});

	return {
		stop,
		pause,
		resume,
		get calls() {
			return calls;
		}
	};
}
