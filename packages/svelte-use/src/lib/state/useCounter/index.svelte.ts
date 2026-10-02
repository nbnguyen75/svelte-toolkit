/** Options for {@link useCounter}. */
export interface UseCounterOptions {
	/** Lower bound applied to `inc` / `dec` / `set`. @default -Infinity */
	max?: number;
	/** Upper bound applied to `inc` / `dec` / `set`. @default Infinity */
	min?: number;
}

/** Counter state returned by {@link useCounter}. */
export interface UseCounterReturn {
	/**
	 * Reset to `value`, or to the initial value when omitted. Passing a value also
	 * redefines what a later bare `reset()` restores.
	 */
	reset: (value?: number) => void;
	/** Subtract `delta` (clamped). */
	dec: (delta?: number) => void;
	/** Add `delta` (clamped). */
	inc: (delta?: number) => void;
	/** Set the count (clamped). */
	set: (value: number) => void;
	/** Current count. Getter-backed (reads live state); write via `set`. */
	readonly count: number;
	/** Read the current count. */
	get: () => number;
}

/**
 * Basic counter with `inc` / `dec` / `set` / `reset` and optional bounds.
 *
 * @param initialValue Starting value. Not clamped, matching VueUse.
 * @param options `min` / `max` clamp bounds.
 * @returns `count` plus the mutators.
 * @example
 * ```ts
 * const counter = useCounter(0, { min: 0 });
 * counter.inc();
 * counter.count; // 1
 * ```
 */
export function useCounter(
	initialValue?: number | (() => number),
	options: UseCounterOptions = {}
): UseCounterReturn {
	const { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } = options;

	let initial = initialValue === undefined ? 0 : resolveNumber(initialValue);
	let count = $state(initial);

	const limit = (n: number): number => Math.min(max, Math.max(min, n));

	return {
		get count() {
			return count;
		},
		dec(delta = 1) {
			count = limit(count - delta);
		},
		get() {
			return count;
		},
		inc(delta = 1) {
			count = limit(count + delta);
		},
		reset(value?: number) {
			initial = value ?? initial;
			count = limit(initial);
		},
		set(value: number) {
			count = limit(value);
		}
	};
}

function resolveNumber(value: number | (() => number)): number {
	return typeof value === 'function' ? value() : value;
}
