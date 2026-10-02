import type { MaybeGetter } from '../../shared/getter.ts';

import { untrack } from 'svelte';

import { resolveGetter } from '../../shared/getter.ts';

/** Per-frame arguments passed to a {@link useRafFn} callback. */
export interface UseRafFnCallbackArguments {
	/** High-resolution timestamp of the current frame. */
	timestamp: DOMHighResTimeStamp;
	/** Milliseconds elapsed since the previous executed frame. */
	delta: number;
}

/** Options for {@link useRafFn}. */
export interface UseRafFnOptions {
	/**
	 * Maximum frames per second; frames inside the budget are skipped without
	 * invoking `fn`. A getter resolves per frame. `null` disables the cap.
	 * @default null
	 */
	fpsLimit?: MaybeGetter<number | null>;
	/**
	 * Start the loop on mount.
	 * @default true
	 */
	immediate?: boolean;
	/**
	 * Stop automatically after the first executed frame.
	 * @default false
	 */
	once?: boolean;
}

/** Controls returned by {@link useRafFn}. */
export interface UseRafFnReturn {
	/** Whether the loop is currently running. Getter-backed (reads live state). */
	readonly isActive: boolean;
	/** Start (or restart) the loop. No-op without `requestAnimationFrame`. */
	resume: () => void;
	/** Stop the loop. Safe to call when idle. */
	pause: () => void;
}

function hasRaf(): boolean {
	return typeof requestAnimationFrame === 'function';
}

/**
 * Run `fn` on every animation frame with `resume` / `pause` controls. Cancels the
 * pending frame on unmount.
 *
 * @param fn Frame callback receiving `{ delta, timestamp }`.
 * @param options `immediate` auto-start, `fpsLimit` cap, and `once` mode.
 * @returns `isActive` plus `pause` and `resume`.
 * @example
 * ```ts
 * useRafFn(({ delta }) => {
 * 	x += delta * 0.06;
 * });
 * ```
 */
export function useRafFn(
	fn: (args: UseRafFnCallbackArguments) => void,
	options: UseRafFnOptions = {}
): UseRafFnReturn {
	const { immediate = true, fpsLimit = null, once = false } = options;

	let isActive = $state(false);
	let previousFrameTimestamp = 0;
	let rafId: number | null = null;

	function loop(timestamp: DOMHighResTimeStamp): void {
		// `pause()` may have been called from inside `fn` on the previous frame;
		// bail before rescheduling.
		if (!isActive) return;

		if (!previousFrameTimestamp) previousFrameTimestamp = timestamp;
		const delta = timestamp - previousFrameTimestamp;

		const limit = resolveGetter(fpsLimit);
		const budget = limit ? 1000 / limit : null;
		if (budget && delta < budget) {
			rafId = requestAnimationFrame(loop);
			return;
		}

		previousFrameTimestamp = timestamp;
		fn({ delta, timestamp });
		if (once) {
			isActive = false;
			rafId = null;
			return;
		}
		rafId = requestAnimationFrame(loop);
	}

	function resume(): void {
		if (isActive || !hasRaf()) return;
		isActive = true;
		previousFrameTimestamp = 0;
		rafId = requestAnimationFrame(loop);
	}

	function pause(): void {
		isActive = false;
		if (rafId !== null && hasRaf()) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
	}

	$effect(() => {
		untrack(() => {
			if (immediate) resume();
		});
		return () => pause();
	});

	return {
		get isActive() {
			return isActive;
		},
		pause,
		resume
	};
}
