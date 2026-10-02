import type { MaybeGetter } from '../../shared/getter.ts';

import { untrack } from 'svelte';

import { resolveGetter } from '../../shared/getter.ts';

/** Options for {@link useTimeoutFn}. */
export interface UseTimeoutFnOptions {
	/**
	 * Invoke the callback synchronously when `start` is called, in addition
	 * to the delayed invocation.
	 * @default false
	 */
	immediateCallback?: boolean;
	/**
	 * Arm the timer on mount.
	 * @default true
	 */
	immediate?: boolean;
}

/** Controls returned by {@link useTimeoutFn}. */
export interface UseTimeoutFnReturn<Args extends unknown[]> {
	/** Arm (or re-arm) the timeout. A running timer is cleared first. */
	start: (...args: Args) => void;
	/** Whether a timeout is currently armed. Getter-backed (destructure-safe). */
	readonly isPending: boolean;
	/** Disarm the timer. Safe to call when idle. */
	stop: () => void;
}

/** Any callable, with argument types erased so it can be invoked with no arguments. */
type AnyFn = (...args: never[]) => unknown;

/**
 * One-shot timer with controls. Disarms itself on unmount.
 *
 * @param cb Callback invoked once per arming.
 * @param interval Delay in milliseconds; a getter resolves at each `start`.
 * @param options `immediate` auto-arm and `immediateCallback` flags.
 * @returns `isPending` plus `start` and `stop`.
 * @example
 * ```ts
 * const { start, stop } = useTimeoutFn(() => save(), 500, { immediate: false });
 * start(); // fires once after 500ms
 * ```
 */
export function useTimeoutFn<Args extends unknown[]>(
	cb: (...args: Args) => void,
	interval: MaybeGetter<number>,
	options: UseTimeoutFnOptions = {}
): UseTimeoutFnReturn<Args> {
	const { immediate = true, immediateCallback = false } = options;

	let isPending = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	// Both mount-driven edges fire the callback with no arguments (VueUse parity):
	// the `immediateCallback` edge, and the delayed fire of the auto-armed timer.
	// TypeScript cannot call a generic `(...args: Args)` with zero arguments, and
	// `no-unsafe-type-assertion` rejects narrowing `Args`, so the callback is
	// widened once to an argument-erased signature. `never[]` admits a
	// zero-argument call and nothing else, so it cannot swallow real arguments by
	// accident — the delayed edge of `start` calls `cb(...args)` directly instead.
	const invokeNoArgs = cb as AnyFn;

	function clear(): void {
		if (timer !== undefined) {
			clearTimeout(timer);
			timer = undefined;
		}
	}

	function stop(): void {
		isPending = false;
		clear();
	}

	function arm(fire: () => void): void {
		clear();
		isPending = true;
		timer = setTimeout(() => {
			isPending = false;
			timer = undefined;
			fire();
		}, resolveGetter(interval));
	}

	function start(...args: Args): void {
		if (immediateCallback) invokeNoArgs();
		arm(() => cb(...args));
	}

	$effect(() => {
		untrack(() => {
			if (immediate) {
				if (immediateCallback) invokeNoArgs();
				arm(() => invokeNoArgs());
			}
		});
		return () => stop();
	});

	return {
		get isPending() {
			return isPending;
		},
		start,
		stop
	};
}
