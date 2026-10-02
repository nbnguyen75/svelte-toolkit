import type { MaybeGetter } from '../getter.ts';

import { resolveGetter } from '../getter.ts';

/** Mapped state returned by {@link useArrayMap}. */
export interface UseArrayMapReturn<T> {
	/** New array with each element mapped. Getter-backed (destructure-safe). */
	readonly value: T[];
}

/**
 * Reactive `Array.map`.
 *
 * @param list Array, or a getter over reactive state.
 * @param fn Mapping invoked per element.
 * @returns Getter-backed `value` holding the mapped copy.
 * @example
 * ```ts
 * const doubled = useArrayMap([1, 2, 3], (n) => n * 2);
 * doubled.value; // [2, 4, 6]
 * ```
 */
export function useArrayMap<T, U>(
	list: MaybeGetter<readonly T[]>,
	fn: (element: T, index: number, array: readonly T[]) => U
): UseArrayMapReturn<U> {
	const mapped = $derived(resolveGetter(list).map(fn));

	return {
		get value() {
			return mapped;
		}
	};
}
