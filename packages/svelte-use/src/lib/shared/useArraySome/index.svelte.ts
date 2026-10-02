import type { MaybeGetter } from '../getter.ts';

import { resolveGetter } from '../getter.ts';

/** Match state returned by {@link useArraySome}. */
export interface UseArraySomeReturn {
	/** `true` when any element passes. Getter-backed (destructure-safe). */
	readonly value: boolean;
}

/**
 * Reactive `Array.some`.
 *
 * @param list Array, or a getter over reactive state.
 * @param fn Predicate invoked per element.
 * @returns Getter-backed `value` that is `true` when any element passes.
 * @example
 * ```ts
 * const any = useArraySome([1, 2, 3], (n) => n > 2);
 * any.value; // true
 * ```
 */
export function useArraySome<T>(
	list: MaybeGetter<readonly T[]>,
	fn: (element: T, index: number, array: readonly T[]) => unknown
): UseArraySomeReturn {
	const some = $derived(resolveGetter(list).some(fn));

	return {
		get value() {
			return some;
		}
	};
}
