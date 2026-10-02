import type { MaybeGetter } from '../../shared/getter.ts';

import { resolveGetter } from '../../shared/getter.ts';

/**
 * Config for the two-value {@link useToggle} overload. Both sides are
 * required: with non-boolean state, "toggle" is only meaningful once the caller
 * has named both values.
 */
export interface UseToggleValues<Truthy, Falsy> {
	truthyValue: MaybeGetter<Truthy>;
	falsyValue: MaybeGetter<Falsy>;
}

/** Toggleable state returned by {@link useToggle}. */
export interface UseToggleReturn<T> {
	/**
	 * Flip between the truthy and falsy values, or set an explicit value when an
	 * argument is passed (an explicit `undefined` counts as a set, matching
	 * VueUse).
	 * @returns The new value.
	 */
	toggle: (...args: [] | [T]) => T;
	/** Current value. Getter/setter-backed, so `bind:` works. */
	value: T;
}

/**
 * Toggle core. The two values arrive as *arguments*, which is what lets the
 * boolean overload work with no cast: `T` is simply inferred as `boolean` there,
 * so no literal ever has to be pushed into a generic slot.
 */
function valuesToggle<T>(truthy: T, falsy: T, initial?: T): UseToggleReturn<T> {
	let state = $state<T>(initial === undefined ? falsy : initial);

	// A default parameter cannot tell `toggle()` from `toggle(undefined)`, but
	// those must behave differently, so the arity is the signal. Rest args carry
	// it in the type (`[] | [T]`) instead of `arguments`.
	function toggle(...args: [] | [T]): T {
		if (args.length > 0) {
			// `noUncheckedIndexedAccess` widens the read, but the arity check above
			// already proves index 0 exists.
			state = args[0]!;
			return state;
		}
		state = Object.is(state, truthy) ? falsy : truthy;
		return state;
	}

	return {
		get value() {
			return state;
		},
		set value(next: T) {
			state = next;
		},
		toggle
	};
}

/**
 * Boolean (or two-value) state with a toggler.
 *
 * @param initialValue Starting value. Omitted means `falsyValue` (`false` for the
 *   boolean overload).
 * @param options Required `truthyValue` / `falsyValue` for non-boolean state.
 * @returns `value` (readable and writable) plus `toggle`.
 * @example
 * ```ts
 * const on = useToggle();
 * on.toggle(); // true
 * on.value = false;
 *
 * const mode = useToggle<'on' | 'off', ''>('on', {
 * 	truthyValue: 'on',
 * 	falsyValue: ''
 * });
 * mode.toggle(); // ''
 * ```
 */
export function useToggle(initialValue?: MaybeGetter<boolean>): UseToggleReturn<boolean>;
export function useToggle<Truthy, Falsy>(
	initialValue: MaybeGetter<Truthy | Falsy>,
	options: UseToggleValues<Truthy, Falsy>
): UseToggleReturn<Truthy | Falsy>;
export function useToggle<Truthy = boolean, Falsy = boolean>(
	initialValue?: MaybeGetter<Truthy | Falsy>,
	options?: UseToggleValues<Truthy, Falsy>
	// Not part of the public API: each overload declares its own return type, so
	// this wider signature is invisible to callers. It exists because the boolean
	// branch infers `T` as `boolean` while the two-value branch keeps the
	// caller's types, and the impl has to satisfy both.
): UseToggleReturn<boolean | Truthy | Falsy> {
	const truthy = options === undefined ? true : resolveGetter(options.truthyValue);
	const falsy = options === undefined ? false : resolveGetter(options.falsyValue);
	const initial = initialValue === undefined ? falsy : resolveGetter(initialValue);
	return valuesToggle<boolean | Truthy | Falsy>(truthy, falsy, initial);
}
