import type { MaybeGetter } from '../getter.ts';

import { resolveGetter } from '../getter.ts';

/** Found state returned by {@link useArrayFindLast}. */
export interface UseArrayFindLastReturn<T> {
	/** Last matching element, or `undefined`. Getter-backed (destructure-safe). */
	readonly value: T | undefined;
}

/**
 * Reactive `Array.findLast`, scanned from the end.
 *
 * @param list Array, or a getter over reactive state.
 * @param fn Predicate invoked per element.
 * @returns Getter-backed `value` holding the last match, or `undefined`.
 * @example
 * ```ts
 * const last = useArrayFindLast([2, 1, 4], (n) => n % 2 === 0);
 * last.value; // 4
 * ```
 */
export function useArrayFindLast<T>(
	list: MaybeGetter<readonly T[]>,
	fn: (element: T, index: number, array: readonly T[]) => unknown
): UseArrayFindLastReturn<T> {
	const found = $derived(resolveGetter(list).findLast(fn));

	return {
		get value() {
			return found;
		}
	};
}
