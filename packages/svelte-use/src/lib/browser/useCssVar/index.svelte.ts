import type { MaybeGetter } from '../../shared/getter.ts';

import { untrack } from 'svelte';

import { resolveGetter } from '../../shared/getter.ts';
import { isBrowser } from '../../shared/is.ts';

/** Options for {@link useCssVar}. */
export interface UseCssVarOptions {
	/** Value held until the element or the caller supplies one. */
	initialValue?: string;
}

/** Reactive CSS custom property cell returned by {@link useCssVar}. */
export interface UseCssVarReturn {
	/** Current value; assigning writes it to the element. Getter/setter-backed (destructure-safe). */
	value: string | undefined;
}

/**
 * Read and write a CSS custom property on an element, in both directions.
 *
 * The binding is a round trip, not a one-way write: the current value is read
 * back out of the element's computed style whenever the element or the property
 * name changes, so a value set in a stylesheet or by other code is picked up
 * instead of being clobbered by `initialValue`.
 *
 * @param prop Custom property name, e.g. `'--brand'`; a getter is re-resolved on every run.
 * @param target Element carrying the property. Defaults to `document.documentElement`.
 * @param options `initialValue`.
 * @returns Getter/setter-backed `value`.
 * @example
 * ```ts
 * const brand = useCssVar('--brand', () => document.documentElement, { initialValue: 'red' });
 * brand.value = 'blue'; // sets --brand: blue
 * brand.value; // 'blue', or whatever the stylesheet last resolved it to
 * ```
 */
export function useCssVar(
	prop: MaybeGetter<string | null | undefined>,
	target?: MaybeGetter<HTMLElement | null | undefined>,
	options: UseCssVarOptions = {}
): UseCssVarReturn {
	const { initialValue } = options;

	let variable = $state<string | undefined>(initialValue);

	const element = $derived(
		resolveGetter(target) ?? (isBrowser ? document.documentElement : undefined)
	);
	const property = $derived(resolveGetter(prop));

	// Non-reactive bookkeeping for the abandoned target. `$effect` teardown
	// cannot be used for this: it also runs on unmount, and wiping the property
	// from `<html>` when a component goes away would undo a caller's own style.
	let lastElement: HTMLElement | undefined;
	let lastProperty: string | null | undefined;

	// Read the element whenever it or the property name changes. `untrack` on
	// `variable` matters: VueUse reads it inside a watch callback, which is
	// untracked, so the read effect must not re-run on every write below.
	$effect(() => {
		const el = element;
		const name = property;
		if (lastElement && lastProperty && (lastElement !== el || lastProperty !== name)) {
			lastElement.style.removeProperty(lastProperty);
		}
		lastElement = el;
		lastProperty = name;
		if (!isBrowser || !el || !name) return;
		const read = getComputedStyle(el).getPropertyValue(name).trim();
		variable = read || untrack(() => variable) || initialValue;
	});

	$effect(() => {
		const value = variable;
		const el = element;
		const name = property;
		if (!el?.style || !name) return;
		if (value == null) el.style.removeProperty(name);
		else el.style.setProperty(name, value);
	});

	return {
		get value() {
			return variable;
		},
		set value(next: string | undefined) {
			variable = next;
		}
	};
}
