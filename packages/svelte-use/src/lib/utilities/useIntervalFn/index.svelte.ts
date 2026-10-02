import type { MaybeGetter } from '../../shared/getter.ts';

import { untrack } from 'svelte';

import { resolveGetter } from '../../shared/getter.ts';

/** Options for {@link useIntervalFn}. */
export interface UseIntervalFnOptions {
	/**
	 * Invoke the callback synchronously when `resume` is called, in addition
	 * to the scheduled invocations.
	 * @default false
	 */
	immediateCallback?: boolean;
	/**
	 * Start the interval on mount.
	 * @default true
	 */
	immediate?: boolean;
}

/** Controls returned by {@link useIntervalFn}. */
export interface UseIntervalFnReturn {
	/** Whether the interval is currently running. Getter-backed (reads live state). */
	readonly isActive: boolean;
	/** (Re)start the interval. Non-positive periods are ignored. */
	resume: () => void;
	/**
	 * Stop the interval. Safe to call when idle, and safe to call from inside
	 * the callback (which cancels the pending reschedule).
	 */
	pause: () => void;
}

/**
 * Repeating timer with `resume` / `pause` controls. Cleared on unmount.
 *
 * @param cb Callback invoked every period.
 * @param interval Period in milliseconds; a getter is tracked, so changing it
 *   while active restarts the timer at the new cadence.
 * @param options `immediate` auto-start and `immediateCallback` flags.
 * @returns `isActive` plus `pause` and `resume`.
 * @example
 * ```ts
 * const clock = useIntervalFn(() => tick(), 1000);
 * clock.pause();
 * clock.resume();
 * ```
 */
export function useIntervalFn(
	cb: () => void,
	interval: MaybeGetter<number> = 1000,
	options: UseIntervalFnOptions = {}
): UseIntervalFnReturn {
	const { immediate = true, immediateCallback = false } = options;

	let isActive = $state(false);
	let timer: ReturnType<typeof setInterval> | undefined;

	function clear(): void {
		if (timer !== undefined) {
			clearInterval(timer);
			timer = undefined;
		}
	}

	function pause(): void {
		isActive = false;
		clear();
	}

	function resume(): void {
		const period = resolveGetter(interval);
		if (period <= 0) return;
		clear();
		isActive = true;
		timer = setInterval(() => cb(), period);
		// Armed before the callback so that an `immediateCallback` which calls
		// `pause()` clears the timer itself, instead of this function needing to
		// re-check `isActive` afterwards (VueUse needs that re-check because it
		// invokes the callback first).
		if (immediateCallback) cb();
	}

	$effect(() => {
		untrack(() => {
			if (immediate) resume();
		});
		return () => pause();
	});

	// A separate effect, deliberately without a cleanup of its own: if the
	// disposal path were read as a "stop" request here, unmounting could be
	// mistaken for a pause. Restarting is gated on `isActive`, so this skips
	// while paused and only re-arms when the period actually changes.
	$effect(() => {
		resolveGetter(interval);
		untrack(() => {
			if (isActive) resume();
		});
	});

	return {
		get isActive() {
			return isActive;
		},
		pause,
		resume
	};
}
