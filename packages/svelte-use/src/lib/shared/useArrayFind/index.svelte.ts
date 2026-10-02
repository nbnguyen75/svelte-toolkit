import type { MaybeGetter } from '../getter.ts';

import { resolveGetter } from '../getter.ts';

/** Found state returned by {@link useArrayFind}. */
export interface UseArrayFindReturn<T> {
	/** First matching element, or `undefined`. Getter-backed (destructure-safe). */
	readonly value: T | undefined;
}

/**
 * Reactive `Array.find`.
 *
 * @param list Array, or a getter over reactive state.
 * @param fn Predicate invoked per element.
 * @returns Getter-backed `value` holding the first match, or `undefined`.
 * @example
 * ```ts
 * const match = useArrayFind([1, 2, 3], (n) => n > 1);
 * match.value; // 2
 * ```
 */
export function useArrayFind<T>(
	list: MaybeGetter<readonly T[]>,
	fn: (element: T, index: number, array: readonly T[]) => unknown
): UseArrayFindReturn<T> {
	const found = $derived(resolveGetter(list).find(fn));

	return {
		get value() {
			return found;
		}
	};
}
