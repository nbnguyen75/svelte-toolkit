import type { MaybeGetter } from '../getter.ts';

import { SvelteSet } from 'svelte/reactivity';

import { resolveGetter } from '../getter.ts';

/**
 * Equality predicate for {@link useArrayUnique}: return `true` when `a`
 * duplicates `b`.
 */
export type UseArrayUniqueCompareFn<T> = (a: T, b: T, array: readonly T[]) => boolean;

/** Unique state returned by {@link useArrayUnique}. */
export interface UseArrayUniqueReturn<T> {
	/** Deduplicated array (first occurrences win). Getter-backed (destructure-safe). */
	readonly value: T[];
}

function uniqueBy<T>(array: readonly T[], compareFn: UseArrayUniqueCompareFn<T>): T[] {
	const out: T[] = [];
	for (const value of array) {
		if (!out.some((other) => compareFn(value, other, array))) out.push(value);
	}
	return out;
}

/**
 * Reactive unique array.
 *
 * @param list Array, or a getter over reactive state.
 * @param compareFn Custom duplicate test; defaults to `Set` semantics.
 * @returns Getter-backed `value` holding the deduplicated array.
 * @example
 * ```ts
 * const unique = useArrayUnique([1, 2, 1]);
 * unique.value; // [1, 2]
 * ```
 */
export function useArrayUnique<T>(
	list: MaybeGetter<readonly T[]>,
	compareFn?: UseArrayUniqueCompareFn<T>
): UseArrayUniqueReturn<T> {
	const unique = $derived.by(() => {
		const resolved = resolveGetter(list);
		// A `Set` already applies SameValueZero and keeps first-occurrence order.
		return compareFn ? uniqueBy(resolved, compareFn) : [...new SvelteSet(resolved)];
	});

	return {
		get value() {
			return unique;
		}
	};
}
