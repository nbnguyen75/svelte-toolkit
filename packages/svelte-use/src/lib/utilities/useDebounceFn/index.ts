/** Edge and cap options for {@link useDebounceFn}. */
export interface UseDebounceOptions {
	/** Invoke on the leading edge of the first call in a burst. @default false */
	leading?: boolean;
	/** Invoke on the trailing edge after `delay` ms of quiet. @default true */
	trailing?: boolean;
	/** Maximum ms to delay before forcing an invocation with the latest args. @default undefined (no cap) */
	maxWait?: number;
}

/** Debounced wrapper: callable plus `cancel` / `flush` / `pending` controls. */
export interface UseDebouncedFunction<Args extends unknown[]> {
	(...args: Args): void;
	/** Drop any pending invocation. Safe to call when idle or twice in a row. */
	cancel: () => void;
	/**
	 * Immediately invoke with the latest args if an invocation is pending,
	 * then clear all timers. No-op when idle.
	 */
	flush: () => void;
	/** Whether an invocation is currently pending (a timer is armed). */
	pending: () => boolean;
}

/**
 * Create a debounced function that delays invoking `fn` until `delay`
 * milliseconds have passed without another call.
 *
 * @param fn Function to debounce.
 * @param delay Quiet period in milliseconds. Values `<= 0` invoke synchronously.
 * @param options `leading` / `trailing` edge flags and `maxWait` cap.
 * @returns The debounced function with `cancel`, `flush`, and `pending` controls.
 * @example
 * ```ts
 * const save = useDebounceFn((text: string) => persist(text), 300);
 * save('hello'); // fires after 300ms quiet
 * save.cancel(); // drop pending
 * ```
 */
export function useDebounceFn<Args extends unknown[]>(
	fn: (...args: Args) => void,
	delay = 200,
	options: UseDebounceOptions = {}
): UseDebouncedFunction<Args> {
	const { leading = false, trailing = true, maxWait } = options;

	let timer: ReturnType<typeof setTimeout> | undefined;
	let maxTimer: ReturnType<typeof setTimeout> | undefined;
	let lastArgs: Args | undefined;

	function clearTimers() {
		if (timer) clearTimeout(timer);
		if (maxTimer) clearTimeout(maxTimer);
		timer = undefined;
		maxTimer = undefined;
	}

	// Invokes with the latest args, if any. Every timer callback routes through
	// here so a cleared burst can never fire `fn` with `undefined` args.
	function invokeLatest() {
		if (lastArgs) fn(...lastArgs);
	}

	function debounced(...args: Args) {
		// Non-positive delay (or cap) means "no debouncing": invoke now,
		// matching VueUse `debounceFilter`.
		if (delay <= 0 || (maxWait !== undefined && maxWait <= 0)) {
			clearTimers();
			lastArgs = undefined;
			fn(...args);
			return;
		}

		lastArgs = args;
		const isFirstCall = !timer && !maxTimer;

		if (isFirstCall && leading) {
			fn(...args);
		}

		if (timer) clearTimeout(timer);

		timer = setTimeout(() => {
			if (trailing && !(isFirstCall && leading)) invokeLatest();
			clearTimers();
		}, delay);

		if (maxWait !== undefined && !maxTimer) {
			maxTimer = setTimeout(() => {
				if (trailing) invokeLatest();
				clearTimers();
			}, maxWait);
		}
	}

	debounced.cancel = () => {
		clearTimers();
		lastArgs = undefined;
	};

	debounced.flush = () => {
		if (lastArgs && (timer || maxTimer)) {
			fn(...lastArgs);
			clearTimers();
		}
	};

	debounced.pending = () => timer !== undefined || maxTimer !== undefined;

	return debounced;
}
