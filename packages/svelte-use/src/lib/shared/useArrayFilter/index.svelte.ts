import type { MaybeGetter } from '../getter.ts';

import { resolveGetter } from '../getter.ts';

/** Filtered state returned by {@link useArrayFilter}. */
export interface UseArrayFilterReturn<T> {
	/** Elements passing the predicate. Getter-backed (destructure-safe). */
	readonly value: T[];
}

/**
 * Reactive `Array.filter`.
 *
 * @param list Array, or a getter over reactive state.
 * @param fn Predicate invoked per element.
 * @returns Getter-backed `value` holding a new filtered array.
 * @example
 * ```ts
 * const evens = useArrayFilter([1, 2, 3, 4], (n) => n % 2 === 0);
 * evens.value; // [2, 4]
 * ```
 */
export function useArrayFilter<T>(
	list: MaybeGetter<readonly T[]>,
	fn: (element: T, index: number, array: readonly T[]) => unknown
): UseArrayFilterReturn<T> {
	const filtered = $derived(resolveGetter(list).filter(fn));

	return {
		get value() {
			return filtered;
		}
	};
}
