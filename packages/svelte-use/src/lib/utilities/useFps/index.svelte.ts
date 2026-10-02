import { useRafFn } from '../useRafFn/index.ts';

/** Options for {@link useFps}. */
export interface UseFpsOptions {
	/**
	 * Frames per sample window; the average is recomputed once this many frames
	 * have elapsed.
	 * @default 10
	 */
	every?: number;
}

/** State returned by {@link useFps}. */
export interface UseFpsReturn {
	/** Latest measured FPS (`0` before the first full window). Getter-backed. */
	readonly value: number;
}

/**
 * Measure rendering FPS over a window of animation frames.
 *
 * Sampling uses `performance.now()`, not the frame timestamp: a background tab
 * throttles frames, and the wall-clock gap is what the reported number means to a
 * reader. Stops on unmount.
 *
 * @param options `every`: frames per sample window.
 * @returns `value`, the latest measured FPS.
 * @example
 * ```ts
 * const fps = useFps();
 * fps.value; // measured frames per second
 * ```
 */
export function useFps(options: UseFpsOptions = {}): UseFpsReturn {
	const { every = 10 } = options;

	let fps = $state(0);

	// Guard before calling `useRafFn` so no loop is created at all: this returns
	// early, so the number of reactive effects constructed stays consistent for a
	// given environment.
	if (typeof performance === 'undefined') {
		return {
			get value() {
				return fps;
			}
		};
	}

	let last = performance.now();
	let ticks = 0;

	useRafFn(() => {
		ticks += 1;
		if (ticks >= every) {
			const now = performance.now();
			const diff = now - last;
			fps = Math.round(1000 / (diff / ticks));
			last = now;
			ticks = 0;
		}
	});

	return {
		get value() {
			return fps;
		}
	};
}
