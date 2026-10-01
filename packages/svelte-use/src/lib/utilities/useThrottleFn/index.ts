/** Edge options for {@link useThrottleFn}. */
export interface UseThrottleOptions {
	/** Invoke on the leading edge of the interval window. @default true */
	leading?: boolean;
	/** Invoke on the trailing edge with the latest args. @default true */
	trailing?: boolean;
}

/** Throttled wrapper: callable plus `cancel` / `flush` controls. */
export interface UseThrottledFunction<Args extends unknown[]> {
	(...args: Args): void;
	/** Drop any pending trailing invocation and reset the window. Safe to call when idle or twice in a row. */
	cancel: () => void;
	/**
	 * Immediately invoke with the latest args if a trailing invocation is
	 * pending, then clear the timer. No-op when idle.
	 */
	flush: () => void;
}

/**
 * Create a throttled function that invokes `fn` at most once per `interval`
 * milliseconds.
 *
 * @param fn Function to throttle.
 * @param interval Minimum milliseconds between invocations. Values `<= 0` invoke every call.
 * @param options `leading` / `trailing` edge flags.
 * @returns The throttled function with `cancel` and `flush` controls.
 * @example
 * ```ts
 * const onScroll = useThrottleFn(() => update(), 200);
 * onScroll(); // at most once per 200ms
 * ```
 */
export function useThrottleFn<Args extends unknown[]>(
	fn: (...args: Args) => void,
	interval = 200,
	options: UseThrottleOptions = {}
): UseThrottledFunction<Args> {
	const { leading = true, trailing = true } = options;

	let lastInvokeTime = 0;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let lastArgs: Args | undefined;

	function invoke(args: Args) {
		lastInvokeTime = Date.now();
		fn(...args);
	}

	// Invokes with the latest args, if any. Guards the trailing timer against
	// firing after `cancel()` cleared them.
	function invokeLatest() {
		if (lastArgs) invoke(lastArgs);
	}

	function throttled(...args: Args) {
		const now = Date.now();
		lastArgs = args;

		if (lastInvokeTime === 0 && !leading) {
			lastInvokeTime = now;
		}

		const remaining = interval - (now - lastInvokeTime);

		if (remaining <= 0) {
			if (timer) {
				clearTimeout(timer);
				timer = undefined;
			}
			invoke(args);
		} else if (!timer && trailing) {
			timer = setTimeout(() => {
				timer = undefined;
				invokeLatest();
			}, remaining);
		}
	}

	throttled.cancel = () => {
		if (timer) clearTimeout(timer);
		timer = undefined;
		lastArgs = undefined;
		lastInvokeTime = 0;
	};

	throttled.flush = () => {
		if (timer) {
			clearTimeout(timer);
			timer = undefined;
			invokeLatest();
		}
	};

	return throttled;
}
