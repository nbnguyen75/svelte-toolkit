import type { MaybeGetter } from '../getter.ts';

import { resolveGetter } from '../getter.ts';

/** Options for {@link useArrayDifference}. */
export interface UseArrayDifferenceOptions {
	/**
	 * Return items missing on either side instead of only `list - values`.
	 * @default false
	 */
	symmetric?: boolean;
}

/** Difference state returned by {@link useArrayDifference}. */
export interface UseArrayDifferenceReturn<T> {
	/** Items of `list` absent from `values` (plus the reverse when symmetric). Getter-backed (destructure-safe). */
	readonly value: T[];
}

function toCompareFn<T>(
	keyOrCompareFn: keyof T | ((value: T, othVal: T) => boolean) | undefined
): (value: T, othVal: T) => boolean {
	if (keyOrCompareFn === undefined) return (value, othVal) => value === othVal;
	if (typeof keyOrCompareFn === 'function') return keyOrCompareFn;
	return (value, othVal) => value[keyOrCompareFn] === othVal[keyOrCompareFn];
}

function missing<T>(
	from: readonly T[],
	against: readonly T[],
	compareFn: (value: T, othVal: T) => boolean
): T[] {
	return from.filter((item) => !against.some((other) => compareFn(item, other)));
}

/**
 * Reactive difference of two arrays, with key, comparator, or symmetric mode.
 * @example
 * ```ts
 * const missing = useArrayDifference([1, 2, 3], [2]);
 * missing.value; // [1, 3]
 * ```
 */
export function useArrayDifference<T>(
	list: MaybeGetter<readonly T[]>,
	values: MaybeGetter<readonly T[]>,
	key?: keyof T,
	options?: UseArrayDifferenceOptions
): UseArrayDifferenceReturn<T>;
/**
 * Reactive difference of two arrays compared with a custom predicate.
 * @example
 * ```ts
 * const byId = (a: Row, b: Row) => a.id === b.id;
 * const missing = useArrayDifference(rows, others, byId);
 * missing.value; // rows without a matching id
 * ```
 */
export function useArrayDifference<T>(
	list: MaybeGetter<readonly T[]>,
	values: MaybeGetter<readonly T[]>,
	compareFn?: (value: T, othVal: T) => boolean,
	options?: UseArrayDifferenceOptions
): UseArrayDifferenceReturn<T>;
export function useArrayDifference<T>(
	list: MaybeGetter<readonly T[]>,
	values: MaybeGetter<readonly T[]>,
	keyOrCompareFn?: keyof T | ((value: T, othVal: T) => boolean),
	options: UseArrayDifferenceOptions = {}
): UseArrayDifferenceReturn<T> {
	const { symmetric = false } = options;
	const compareFn = toCompareFn(keyOrCompareFn);

	const difference = $derived.by(() => {
		const resolved = resolveGetter(list);
		const others = resolveGetter(values);
		const first = missing(resolved, others, compareFn);
		return symmetric ? [...first, ...missing(others, resolved, compareFn)] : first;
	});

	return {
		get value() {
			return difference;
		}
	};
}
