import type { MaybeGetter } from '../../shared/getter.ts';

import { resolveGetter } from '../../shared/getter.ts';

/** Options for {@link useControllableState}. */
export interface UseControllableStateOptions<T> {
	/**
	 * The initial value when uncontrolled. Read once at setup, like
	 * `useState(default)` — a getter that changes later does not reset the
	 * state.
	 */
	defaultValue?: MaybeGetter<T | undefined>;
	/**
	 * The controlled value, or a getter re-read on every access. Present and
	 * non-`undefined` means the caller owns the state; `undefined` means this
	 * util owns it. Which mode applies is locked at setup.
	 */
	value?: MaybeGetter<T | undefined>;
}

/** Controlled-or-uncontrolled state returned by {@link useControllableState}. */
export interface UseControllableStateReturn<T> {
	/**
	 * The controlled value while controlled, else the internal state.
	 * Assigning writes the internal state only while uncontrolled; while
	 * controlled the write is a no-op and the owner must pass the new value
	 * back through `value`.
	 */
	value: T | undefined;
}

/**
 * State that is either controlled by the caller or owned internally.
 *
 * Controlled (`value` provided): the getter reports it and the setter is a
 * no-op. Uncontrolled: the setter writes an internal `$state` seeded from
 * `defaultValue`. The mode is locked at setup — flipping between them is a
 * bug in the caller, not a transition this util performs.
 *
 * Must be called in component initialization.
 *
 * @param options `value` and `defaultValue`.
 * @returns `value`, readable and assignable.
 * @example
 * ```ts
 * import { useControllableState } from '@wynn-dev/svelte-use';
 *
 * const open = useControllableState<boolean>({ defaultValue: false });
 * open.value = true;
 * console.log(open.value);
 * ```
 */
export function useControllableState<T>(
	options: UseControllableStateOptions<T> = {}
): UseControllableStateReturn<T> {
	// Locked at setup, like Base UI's `useRef` lock: a component that flips
	// modes mid-life has a bug, and re-locking would silently drop state.
	const isControlled = resolveGetter(options.value) !== undefined;
	let internal = $state<T | undefined>(resolveGetter(options.defaultValue));

	return {
		get value() {
			// The lock applies to reads too: a `value` arriving after an
			// uncontrolled start must not take over, or state drops silently.
			if (!isControlled) return internal;
			return resolveGetter(options.value);
		},
		set value(next: T | undefined) {
			if (!isControlled) internal = next;
		}
	};
}
