import { untrack } from 'svelte';

import { type MaybeGetter, resolveGetter } from '../../shared/getter.ts';

/** Read-only controlled derivation returned by {@link computedWithControl}. */
export interface ComputedWithControlReturn<T> {
	/** Force recomputation on the next read. */
	trigger: () => void;
	/** Memoized value; recomputes on source changes or `trigger()`. */
	readonly value: T;
}

/** Writable controlled derivation returned by {@link computedWithControl}. */
export interface WritableComputedWithControlReturn<T> {
	/** Force recomputation on the next read. */
	trigger: () => void;
	/** Memoized value; writes run the provided setter. Getter/setter-backed. */
	value: T;
}

/**
 * Derived value with an explicit source and a manual refresh trigger.
 *
 * The result is memoized per revision: it recomputes when `source` changes or
 * when `trigger()` is called, and not on reads alone. Reads inside `fn` are
 * untracked, so only `source` decides when to recompute.
 *
 * @param source Reactive source that drives recomputation.
 * @param fn Derivation, or a `{ get, set }` pair for a writable value.
 * @returns A getter-backed handle exposing `value` and `trigger`.
 * @example
 * ```ts
 * const total = computedWithControl(() => items, () => items.length);
 * total.trigger(); // force a refresh
 * ```
 */
export function computedWithControl<T>(
	source: MaybeGetter<unknown>,
	fn: () => T
): ComputedWithControlReturn<T>;
export function computedWithControl<T>(
	source: MaybeGetter<unknown>,
	fn: { set: (value: T) => void; get: () => T }
): WritableComputedWithControlReturn<T>;
export function computedWithControl<T>(
	source: MaybeGetter<unknown>,
	fn: (() => T) | { set: (value: T) => void; get: () => T }
): ComputedWithControlReturn<T> {
	const read = typeof fn === 'function' ? fn : fn.get;
	const write = typeof fn === 'function' ? undefined : fn.set;

	let epoch = $state(0);
	let revision = -1;
	let cached: { value: T } | undefined;

	$effect(() => {
		resolveGetter(source);
		untrack(() => {
			epoch += 1;
		});
	});

	const current = (): T => {
		const seen = epoch;
		if (cached === undefined || seen !== revision) {
			cached = { value: untrack(() => read()) };
			revision = seen;
		}
		return cached.value;
	};

	const trigger = (): void => {
		epoch += 1;
	};

	if (write) {
		return {
			get value() {
				return current();
			},
			set value(next: T) {
				write(next);
			},
			trigger
		};
	}

	return {
		get value() {
			return current();
		},
		trigger
	};
}
