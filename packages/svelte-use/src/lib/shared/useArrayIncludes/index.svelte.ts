import type { MaybeGetter } from '../getter.ts';

import { resolveGetter } from '../getter.ts';
import { isObject } from '../is.ts';

/** Equality test for {@link useArrayIncludes}. */
export type UseArrayIncludesComparatorFn<T, V> = (
	element: T,
	value: V,
	index: number,
	array: readonly T[]
) => boolean;

/** Options for {@link useArrayIncludes}. */
export interface UseArrayIncludesOptions<T, V> {
	/** Comparator function or element key. Defaults to strict equality. */
	comparator?: UseArrayIncludesComparatorFn<T, V> | keyof T;
	/**
	 * Start searching at this index.
	 * @default 0
	 */
	fromIndex?: number;
}

/** Membership state returned by {@link useArrayIncludes}. */
export interface UseArrayIncludesReturn {
	/** Whether `value` was found. Getter-backed (destructure-safe). */
	readonly value: boolean;
}

/** `SameValueZero`, so `NaN` matches itself and `0` matches `-0`. */
function sameValueZero(a: unknown, b: unknown): boolean {
	return a === b || Object.is(a, b);
}

function toComparator<T, V>(
	comparator: UseArrayIncludesComparatorFn<T, V> | keyof T | undefined
): UseArrayIncludesComparatorFn<T, V> {
	if (comparator === undefined) return sameValueZero;
	if (typeof comparator === 'function') return comparator;
	return (element, value) => Object.is(element[comparator], value);
}

/** Only a plain object can be an options bag; functions and keys cannot. */
function isOptions<T, V>(
	value: UseArrayIncludesComparatorFn<T, V> | keyof T | UseArrayIncludesOptions<T, V> | undefined
): value is UseArrayIncludesOptions<T, V> {
	return isObject(value);
}

/**
 * Reactive membership check with a comparator, an element key, or a
 * `fromIndex` offset.
 * @example
 * ```ts
 * const known = useArrayIncludes([1, 2, 3], 2);
 * known.value; // true
 * ```
 */
export function useArrayIncludes<T, V>(
	list: MaybeGetter<readonly T[]>,
	value: MaybeGetter<V>,
	comparator?: UseArrayIncludesComparatorFn<T, V>
): UseArrayIncludesReturn;
/**
 * Reactive membership check comparing a single property of each element.
 * @example
 * ```ts
 * const admins = useArrayIncludes(users, 2, 'id');
 * admins.value; // users contains the user with id 2
 * ```
 */
export function useArrayIncludes<T, V>(
	list: MaybeGetter<readonly T[]>,
	value: MaybeGetter<V>,
	comparator?: keyof T
): UseArrayIncludesReturn;
/**
 * Reactive membership check configured with an options object.
 * @example
 * ```ts
 * const tail = useArrayIncludes(ids, 2, { fromIndex: 2 });
 * tail.value; // false when 2 only occurs before index 2
 * ```
 */
export function useArrayIncludes<T, V>(
	list: MaybeGetter<readonly T[]>,
	value: MaybeGetter<V>,
	options?: UseArrayIncludesOptions<T, V>
): UseArrayIncludesReturn;
export function useArrayIncludes<T, V>(
	list: MaybeGetter<readonly T[]>,
	value: MaybeGetter<V>,
	comparatorOrKeyOrOptions?:
		| UseArrayIncludesComparatorFn<T, V>
		| keyof T
		| UseArrayIncludesOptions<T, V>
): UseArrayIncludesReturn {
	let compare: UseArrayIncludesComparatorFn<T, V>;
	let fromIndex = 0;

	if (isOptions<T, V>(comparatorOrKeyOrOptions)) {
		compare = toComparator(comparatorOrKeyOrOptions.comparator);
		fromIndex = comparatorOrKeyOrOptions.fromIndex ?? 0;
	} else {
		compare = toComparator(comparatorOrKeyOrOptions);
	}

	const included = $derived(
		resolveGetter(list)
			.slice(fromIndex)
			.some((element, index, array) => compare(element, resolveGetter(value), index, array))
	);

	return {
		get value() {
			return included;
		}
	};
}
