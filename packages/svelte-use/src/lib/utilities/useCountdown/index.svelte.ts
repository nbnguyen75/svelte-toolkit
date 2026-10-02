import type { MaybeGetter } from '../../shared/getter.ts';

import { resolveGetter } from '../../shared/getter.ts';
import { useIntervalFn } from '../useIntervalFn/index.ts';

/** Scheduler factory for {@link useCountdown}: pause/resume/isActive controls. */
export interface UseCountdownScheduler {
	readonly isActive: boolean;
	resume: () => void;
	pause: () => void;
}

/** Options for {@link useCountdown}. */
export interface UseCountdownOptions {
	/**
	 * Tick source factory. Defaults to a 1-second `useIntervalFn` that starts
	 * paused, so nothing ticks until `start()` / `resume()`.
	 *
	 * Injecting the scheduler keeps the countdown's own logic free of real
	 * timers, so tests can drive it frame by frame — and lets a consumer swap in
	 * a different cadence (e.g. a `useRafFn` tied to the display refresh).
	 */
	scheduler?: (cb: () => void) => UseCountdownScheduler;
	/** Called once when the countdown reaches zero. */
	onComplete?: () => void;
	/** Called on every tick. */
	onTick?: () => void;
}

/** State returned by {@link useCountdown}. */
export interface UseCountdownReturn {
	/** Reset to `countdown` (or the initial value) without starting. */
	reset: (countdown?: MaybeGetter<number>) => void;
	/** Reset to `countdown` (or the initial value) and start. */
	start: (countdown?: MaybeGetter<number>) => void;
	/** Whether the countdown is currently ticking. Getter-backed. */
	readonly isActive: boolean;
	/** Resume ticking (no-op when already active or finished). */
	resume: () => void;
	/** Pause the countdown, keeping the remaining value. */
	pause: () => void;
	/** Seconds remaining. Getter/setter-backed, so `bind:` works and destructuring keeps the setter. */
	remaining: number;
	/** Pause and reset to the initial value. */
	stop: () => void;
}

/**
 * Countdown in seconds, with `start` / `pause` / `resume` / `reset` / `stop`.
 *
 * @param initialCountdown Starting value; a getter re-resolves on `reset()`.
 * @param options `scheduler` factory plus `onTick` / `onComplete` callbacks.
 * @returns `remaining`, `isActive`, and the lifecycle controls.
 * @example
 * ```ts
 * const timer = useCountdown(10, { onComplete: () => finish() });
 * timer.start();
 * timer.remaining; // seconds left
 * ```
 */
export function useCountdown(
	initialCountdown: MaybeGetter<number>,
	options: UseCountdownOptions = {}
): UseCountdownReturn {
	const {
		scheduler = (cb: () => void) => useIntervalFn(cb, 1000, { immediate: false }),
		onComplete,
		onTick
	} = options;

	let remaining = $state(resolveGetter(initialCountdown));

	// `controls` is read inside the tick callback, which only runs after this
	// constructor returns, so the self-reference is safe. A scheduler that
	// invoked `cb` synchronously during construction would still hit the TDZ —
	// documented rather than guarded, since it would mean the callback could fire
	// before any countdown state exists.
	const controls = scheduler(() => {
		const value = remaining - 1;
		remaining = value < 0 ? 0 : value;
		onTick?.();
		if (remaining <= 0) {
			controls.pause();
			onComplete?.();
		}
	});

	function reset(countdown?: MaybeGetter<number>): void {
		remaining =
			countdown === undefined ? resolveGetter(initialCountdown) : resolveGetter(countdown);
	}

	return {
		get isActive() {
			return controls.isActive;
		},
		pause() {
			controls.pause();
		},
		get remaining() {
			return remaining;
		},
		set remaining(value: number) {
			remaining = value;
		},
		reset,
		resume() {
			if (!controls.isActive && remaining > 0) controls.resume();
		},
		start(countdown?: MaybeGetter<number>) {
			reset(countdown);
			controls.resume();
		},
		stop() {
			controls.pause();
			reset();
		}
	};
}
