import type { MaybeGetter } from '../getter.ts';

import { resolveGetter } from '../getter.ts';

/** Match state returned by {@link useArrayEvery}. */
export interface UseArrayEveryReturn {
	/** `true` when every element passes. Getter-backed (destructure-safe). */
	readonly value: boolean;
}

/**
 * Reactive `Array.every`.
 *
 * @param list Array, or a getter over reactive state.
 * @param fn Predicate invoked per element.
 * @returns Getter-backed `value` that is `true` when every element passes.
 * @example
 * ```ts
 * const all = useArrayEvery([2, 4], (n) => n % 2 === 0);
 * all.value; // true
 * ```
 */
export function useArrayEvery<T>(
	list: MaybeGetter<readonly T[]>,
	fn: (element: T, index: number, array: readonly T[]) => unknown
): UseArrayEveryReturn {
	const every = $derived(resolveGetter(list).every(fn));

	return {
		get value() {
			return every;
		}
	};
}
