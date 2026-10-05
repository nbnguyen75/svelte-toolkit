import type { UseRafFnReturn } from '../useRafFn/index.ts';

import { timestamp as currentTimestamp } from '../../shared/is.ts';
import { useRafFn } from '../useRafFn/index.ts';

export interface UseTimestampOptions {
	/** Called with each new value, after the state has been updated. */
	callback?: (timestamp: number) => void;
	/**
	 * Offset in milliseconds added to the reported value.
	 *
	 * Read per frame, so the value it produces is always
	 * `Date.now() + offset`.
	 *
	 * @default 0
	 */
	offset?: number;
}

/**
 * Reactive epoch-milliseconds clock, plus the loop that drives it.
 *
 * Extends {@link UseRafFnReturn}, so the loop is already running when this
 * returns and `pause` / `resume` / `isActive` behave exactly as they do there.
 */
export interface UseTimestampReturn extends UseRafFnReturn {
	/**
	 * Current epoch milliseconds plus `offset`. Getter-backed.
	 *
	 * Millisecond resolution, read from `Date.now()` rather than the frame
	 * timestamp: a high-refresh display produces frames faster than the clock
	 * ticks, so consecutive frames legitimately report the same number.
	 */
	readonly timestamp: number;
}

/**
 * Reactive current timestamp in epoch milliseconds, refreshed on every animation
 * frame.
 *
 * The frame loop is the shipped {@link useRafFn} and nothing more, so this owns
 * no timing logic of its own: it exists to own the number, which `useRafFn`
 * hands you only as a callback argument.
 *
 * Pausing freezes the value where it stood rather than resetting it, and
 * `resume()` picks up from the current clock - there is no catch-up burst, since
 * nothing is counting missed frames.
 *
 * @param options `offset` added to every value, and a `callback` per update.
 * @returns `timestamp` plus the loop's `isActive`, `pause` and `resume`.
 * @example
 * ```ts
 * const { timestamp } = useTimestamp({ offset: -8 * 60 * 60 * 1000 });
 * // epoch milliseconds eight hours behind, e.g. for US Eastern time
 * ```
 * @example
 * ```svelte
 * <script lang="ts">
 * 	import { useTimestamp } from '@wynn-dev/svelte-use';
 *
 * 	const { timestamp, pause } = useTimestamp({
 * 		callback: (value) => console.log(value)
 * 	});
 * </script>
 *
 * <p>{new Date(timestamp).toLocaleTimeString()}</p>
 * <button onclick={pause}>Freeze</button>
 * ```
 */
export function useTimestamp(options: UseTimestampOptions = {}): UseTimestampReturn {
	const { offset = 0, callback } = options;

	let timestamp = $state(currentTimestamp() + offset);

	const raf = useRafFn(() => {
		const value = currentTimestamp() + offset;
		timestamp = value;
		callback?.(value);
	});

	return {
		get isActive() {
			return raf.isActive;
		},
		pause: raf.pause,
		resume: raf.resume,
		get timestamp() {
			return timestamp;
		}
	};
}
