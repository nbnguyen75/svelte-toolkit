import type { MaybeGetter } from '../getter.ts';

import { resolveGetter } from '../getter.ts';

/** Found-index state returned by {@link useArrayFindIndex}. */
export interface UseArrayFindIndexReturn {
	/** Index of the first matching element, or `-1`. Getter-backed (destructure-safe). */
	readonly value: number;
}

/**
 * Reactive `Array.findIndex`.
 *
 * @param list Array, or a getter over reactive state.
 * @param fn Predicate invoked per element.
 * @returns Getter-backed `value` with the first matching index, or `-1`.
 * @example
 * ```ts
 * const index = useArrayFindIndex([1, 3, 4], (n) => n % 2 === 0);
 * index.value; // 2
 * ```
 */
export function useArrayFindIndex<T>(
	list: MaybeGetter<readonly T[]>,
	fn: (element: T, index: number, array: readonly T[]) => unknown
): UseArrayFindIndexReturn {
	const found = $derived(resolveGetter(list).findIndex(fn));

	return {
		get value() {
			return found;
		}
	};
}
