import type { MaybeHTMLElement } from '../../shared/element.ts';
import type { MaybeGetter } from '../../shared/getter.ts';

import { useEventListener } from '../../browser/useEventListener/index.ts';
import { resolveGetter } from '../../shared/getter.ts';
import { isBrowser } from '../../shared/is.ts';

/**
 * Options for {@link useFocus}.
 *
 * Every property accepts `undefined`, so a Svelte
 * `let focusVisible = $state<boolean>()` can be forwarded straight through.
 */
export interface UseFocusOptions {
	/** Skip scrolling the element into view when focusing. @default false */
	preventScroll?: boolean | undefined;
	/**
	 * Focus the element as soon as it exists, and again whenever the target
	 * changes.
	 * @default false
	 */
	initialValue?: boolean | undefined;
	/**
	 * Report focus only when the browser considers it keyboard-visible, matching
	 * what `:focus-visible` styles.
	 * @default false
	 */
	focusVisible?: boolean | undefined;
}

/** Reactive state returned by {@link useFocus}. */
export interface UseFocusReturn {
	set focused(next: boolean);
	/**
	 * Whether the element has focus. Assign `true` to focus it, `false` to blur
	 * it — the same two-way contract VueUse's writable computed gives, without a
	 * `.value`.
	 */
	get focused(): boolean;
}

/**
 * Track or set the focus state of a DOM element.
 *
 * Must be called in component initialization. Listening is done with
 * {@link useEventListener}, so the listener moves with the target and is removed
 * on unmount.
 *
 * @param target Element to focus or watch, or a getter returning it.
 * @param options `initialValue`, `focusVisible`, `preventScroll`.
 * @returns `focused`, readable and assignable.
 * @example
 * ```ts
 * const { focused } = useFocus(() => input);
 * focused = true; // calls input.focus()
 * ```
 */
export function useFocus(
	target: MaybeGetter<MaybeHTMLElement>,
	options: UseFocusOptions = {}
): UseFocusReturn {
	const { initialValue = false, focusVisible = false, preventScroll = false } = options;

	// `$state` because `focused` is read from templates. The effect below never
	// *reads* it - focusing dispatches `focus` synchronously, which writes it -
	// so writing it there cannot make that effect depend on it.
	let innerFocused = $state(false);

	const element = () => (isBrowser ? resolveGetter(target) : null);

	useEventListener(
		element,
		'focus',
		() => {
			// Checked only when asked for: `matches(':focus-visible')` forces a
			// style recalculation, which is not free on a focus handler. VueUse
			// short-circuits here for the same reason.
			if (focusVisible && !element()?.matches(':focus-visible')) return;
			innerFocused = true;
		},
		{ passive: true }
	);
	useEventListener(element, 'blur', () => (innerFocused = false), { passive: true });

	$effect(() => {
		const el = element();
		if (!initialValue || !el) return;
		// Focusing an already-focused element fires no event, so this needs no
		// check against `innerFocused` — and not reading it is what keeps this
		// effect from depending on the state it writes.
		el.focus({ preventScroll });
	});

	function setFocused(next: boolean) {
		const el = element();
		if (!el) return;
		if (next) {
			if (!innerFocused) el.focus({ preventScroll });
		} else if (innerFocused) el.blur();
	}

	return {
		get focused() {
			return innerFocused;
		},
		set focused(next: boolean) {
			setFocused(next);
		}
	};
}
