import type { MaybeGetter } from '../getter.ts';

import { resolveGetter } from '../getter.ts';

/** Reducer over `(previous, current, index)`. */
export type UseArrayReducer<Previous, Current, Result> = (
	previousValue: Previous,
	currentValue: Current,
	currentIndex: number
) => Result;

/** Reduced state returned by {@link useArrayReduce}. */
export interface UseArrayReduceReturn<T> {
	/** Reduction result. Getter-backed (destructure-safe). */
	readonly value: T;
}

/**
 * Reactive `Array.reduce` without an initial value. The first element seeds
 * the accumulator and indices start at `1`.
 * @example
 * ```ts
 * const total = useArrayReduce([1, 2, 3], (sum, n) => sum + n);
 * total.value; // 6
 * ```
 */
export function useArrayReduce<T>(
	list: MaybeGetter<readonly T[]>,
	reducer: UseArrayReducer<T, T, T>
): UseArrayReduceReturn<T>;
/**
 * Reactive `Array.reduce` with an initial value. The accumulator may differ
 * from the element type and indices start at `0`.
 * @example
 * ```ts
 * const total = useArrayReduce([1, 2, 3], (sum, n) => sum + n, 100);
 * total.value; // 106
 * ```
 */
export function useArrayReduce<T, U>(
	list: MaybeGetter<readonly T[]>,
	reducer: UseArrayReducer<U, T, U>,
	initialValue: MaybeGetter<U>
): UseArrayReduceReturn<U>;
export function useArrayReduce<T>(
	list: MaybeGetter<readonly T[]>,
	reducer: UseArrayReducer<T, T, T>,
	initialValue?: MaybeGetter<T>
): UseArrayReduceReturn<T> {
	const reduced = $derived.by(() => {
		const resolved = resolveGetter(list);
		return initialValue === undefined
			? resolved.reduce(reducer)
			: resolved.reduce(reducer, resolveGetter(initialValue));
	});

	return {
		get value() {
			return reduced;
		}
	};
}
