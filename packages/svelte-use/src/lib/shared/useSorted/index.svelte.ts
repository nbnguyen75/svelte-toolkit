import type { MaybeGetter } from '../getter.ts';

import { resolveGetter } from '../getter.ts';

/** Comparison for {@link useSorted}. */
export type UseSortedCompareFn<T> = (a: T, b: T) => number;

/** Sort implementation for {@link useSorted}. */
export type UseSortedFn<T> = (arr: T[], compareFn: UseSortedCompareFn<T>) => T[];

/** Options for {@link useSorted}. */
export interface UseSortedOptions<T> {
	/**
	 * Custom comparison. The default subtracts (numbers).
	 */
	compareFn?: UseSortedCompareFn<T>;
	/**
	 * Custom sort implementation.
	 * @default (arr, compareFn) => arr.sort(compareFn)
	 */
	sortFn?: UseSortedFn<T>;
	/**
	 * Sort the source array in place instead of returning a sorted copy.
	 * Requires component initialization.
	 * @default false
	 */
	dirty?: boolean;
}

/** Sorted state returned by {@link useSorted}. */
export interface UseSortedReturn<T> {
	/** Sorted array (a copy, or the mutated source in `dirty` mode). Getter-backed (destructure-safe). */
	readonly value: T[];
}

/** `ToNumber` is exactly the conversion `-` performs, so this matches `a - b`. */
function numericCompare<T>(a: T, b: T): number {
	return Number(a) - Number(b);
}

function defaultSort<T>(source: T[], compareFn: UseSortedCompareFn<T>): T[] {
	return source.toSorted(compareFn);
}

function toOptions<T>(
	compareFnOrOptions: UseSortedCompareFn<T> | UseSortedOptions<T> | undefined,
	options: UseSortedOptions<T> | undefined
): UseSortedOptions<T> {
	if (typeof compareFnOrOptions === 'function') {
		return options === undefined
			? { compareFn: compareFnOrOptions }
			: { ...options, compareFn: compareFnOrOptions };
	}
	return compareFnOrOptions ?? options ?? {};
}

/**
 * Reactive sorted array — copy-on-read by default, in-place with `dirty`.
 * @example
 * ```ts
 * const ranked = useSorted([3, 1, 2]);
 * ranked.value; // [1, 2, 3] (source untouched)
 * ```
 */
export function useSorted<T>(
	source: MaybeGetter<T[]>,
	compareFn?: UseSortedCompareFn<T>
): UseSortedReturn<T>;
/**
 * Reactive sorted array configured with an options object.
 * @example
 * ```ts
 * const names = useSorted(['b', 'a'], { compareFn: (a, b) => a.localeCompare(b) });
 * names.value; // ['a', 'b']
 * ```
 */
export function useSorted<T>(
	source: MaybeGetter<T[]>,
	options?: UseSortedOptions<T>
): UseSortedReturn<T>;
/**
 * Reactive sorted array with a compare function and separate options.
 * @example
 * ```ts
 * const ranked = useSorted([3, 1, 2], (a, b) => a - b, { dirty: true });
 * ```
 */
export function useSorted<T>(
	source: MaybeGetter<T[]>,
	compareFn?: UseSortedCompareFn<T>,
	options?: Omit<UseSortedOptions<T>, 'compareFn'>
): UseSortedReturn<T>;
export function useSorted<T>(
	source: MaybeGetter<T[]>,
	compareFnOrOptions?: UseSortedCompareFn<T> | UseSortedOptions<T>,
	options?: UseSortedOptions<T>
): UseSortedReturn<T> {
	const {
		compareFn = numericCompare,
		sortFn = defaultSort,
		dirty = false
	} = toOptions(compareFnOrOptions, options);

	if (dirty) {
		$effect(() => {
			const current = resolveGetter(source);
			const result = sortFn([...current], compareFn);
			// Splice only on real order changes so the effect settles
			// instead of re-triggering itself.
			const changed =
				result.length !== current.length ||
				result.some((item, index) => !Object.is(item, current[index]));
			if (changed) current.splice(0, current.length, ...result);
		});
	}

	const sorted = $derived(
		dirty ? resolveGetter(source) : sortFn([...resolveGetter(source)], compareFn)
	);

	return {
		get value() {
			return sorted;
		}
	};
}
