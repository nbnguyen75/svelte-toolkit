import type { MaybeHTMLElement } from '../../shared/element.ts';
import type { MaybeGetter } from '../../shared/getter.ts';

import { useEventListener } from '../../browser/useEventListener/index.ts';
import { resolveGetter } from '../../shared/getter.ts';
import { isBrowser, isNode } from '../../shared/is.ts';

/** Reactive state returned by {@link useFocusWithin}. */
export interface UseFocusWithinReturn {
	/** Whether the element or any of its descendants currently has focus. */
	readonly focused: boolean;
}

/**
 * Track whether focus is inside the target element, descendants included.
 *
 * Must be called in component initialization. Built on `focusin` / `focusout`,
 * which bubble, so one listener per element covers the whole subtree.
 *
 * The `focusout` handler reads `relatedTarget` — the element focus is moving
 * *to* — rather than re-checking `:focus-within`. That is the difference between
 * a correct answer and a stale `true`: `focusout` is dispatched before focus has
 * actually moved, so a pseudo-class check at that moment still sees the old
 * focus and would leave the flag set after focus left the subtree.
 *
 * @param target Element to watch, or a getter returning it.
 * @returns `focused`.
 * @example
 * ```ts
 * const { focused } = useFocusWithin(() => form);
 * ```
 */
export function useFocusWithin(target: MaybeGetter<MaybeHTMLElement>): UseFocusWithinReturn {
	let focused = $state(false);

	const element = () => (isBrowser ? resolveGetter(target) : null);

	useEventListener(element, 'focusin', () => (focused = true), { passive: true });

	useEventListener(
		element,
		'focusout',
		(event) => {
			const el = element();
			// `relatedTarget` is null when focus left the document, and is the
			// receiving element when it moved within the subtree - which means no
			// `focusout` listener call is needed for an internal move.
			const next = event.relatedTarget;
			focused = !!el && isNode(next) && (next === el || el.contains(next));
		},
		{ passive: true }
	);

	return {
		get focused() {
			return focused;
		}
	};
}
