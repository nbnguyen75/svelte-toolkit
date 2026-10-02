import { resolveGetter } from '../../shared/getter.ts';

/**
 * Tracks the previous value of a reactive source.
 *
 * The first read returns `initialValue`; every later read returns the value the
 * source held before the most recent change, compared with `Object.is`.
 *
 * @param source Reactive source: a value or a getter over reactive state.
 * @param initialValue Value returned before the first change.
 * @returns Getter returning the previous value.
 * @example
 * ```ts
 * const previousCount = usePrevious(count);
 * $effect(() => {
 * 	previousCount(); // value before the latest `count` change
 * });
 * ```
 */
export function usePrevious<T>(source: () => T, initialValue?: T): () => T | undefined;
export function usePrevious<T>(source: T, initialValue?: T): () => T | undefined;
export function usePrevious<T>(source: T | (() => T), initialValue?: T): () => T | undefined {
	const read = (): T => resolveGetter(source);
	let previous = $state<T | undefined>(initialValue);
	// The value from the previous effect run. Deliberately non-reactive: it is
	// only read by the effect that writes it.
	let last: T | undefined;
	let first = true;

	$effect(() => {
		const current = read();
		if (first) {
			first = false;
			last = current;
			return;
		}
		// `last` is the value the source held before this change.
		previous = last;
		last = current;
	});

	return () => previous;
}
