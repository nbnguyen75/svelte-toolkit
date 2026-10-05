import type { MaybeGetter } from './getter.ts';

import { notNullish } from './is.ts';
import { resolveGetter } from './getter.ts';

/**
 * A single element target. `null` / `undefined` is the normal "not mounted
 * yet" value for `bind:this`, so it is part of the type rather than something
 * every caller has to guard.
 */
export type MaybeElement = Element | null | undefined;

/**
 * A single HTML element target.
 *
 * Narrower than {@link MaybeElement} on purpose: `focus()` / `blur()` and the
 * focus event maps only exist on `HTMLElement`, so focus utilities typed this
 * way get correct events and call signatures instead of casts.
 */
export type MaybeHTMLElement = HTMLElement | null | undefined;

/**
 * One element, several, or a getter returning either.
 *
 * The array form covers `bind:group` and reactive lists; the getter form
 * re-resolves on every read, so `$effect` re-observes when the element changes.
 * @example
 * ```ts
 * declare const card: MaybeGetter<HTMLElement | null>;
 * declare const row: HTMLElement[];
 * useMutationObserver(() => card, onChange);
 * useMutationObserver(row, onChange);
 * ```
 */
export type MaybeElements = MaybeGetter<MaybeElement | MaybeElement[] | null | undefined>;

/**
 * Flatten a {@link MaybeElements} into the elements to observe.
 *
 * Nullish entries are dropped rather than throwing, because a `bind:this` that
 * has not resolved yet is a normal state, not an error. Duplicates collapse:
 * observing the same element twice delivers two entries per mutation, and
 * repeated elements are easy to produce by accident from a reactive list.
 */
export function resolveElements(target: MaybeElements): Element[] {
	const value = resolveGetter(target);
	if (!value) return [];
	const list = Array.isArray(value) ? value : [value];
	return [...new Set(list.filter(notNullish))];
}

/**
 * Window detection without `instanceof`, which fails across realms (iframes, and
 * test runners evaluating modules in separate VM contexts). A scrollable element
 * never carries a numeric `scrollY`, and `in` narrowing is enough here because
 * the check is on the property's type rather than on the object.
 *
 * @internal
 */
export function isWindowLike(target: object): target is Window {
	return 'scrollY' in target && typeof target.scrollY === 'number';
}

/** Document detection by `nodeType`, for the same cross-realm reason. @internal */
export function isDocumentLike(target: object): target is Document {
	return 'nodeType' in target && target.nodeType === 9;
}

/**
 * Scroll-metric-capable element. Written as a guard rather than a
 * `'scrollTop' in target` narrowing because `in` on a bare `object` only adds
 * the key to the type — it cannot produce `HTMLElement | SVGElement`, and the
 * repo forbids the assertion that would.
 *
 * @internal
 */
export function isScrollableElement(target: object): target is HTMLElement | SVGElement {
	return 'scrollTop' in target && 'scrollHeight' in target;
}

/**
 * The element whose scroll metrics describe `target`. A window and a document
 * both scroll as their `documentElement`; `Document` is duck-typed to
 * `documentElement` rather than VueUse's `document.body` write target, so reads
 * and writes agree in standards mode.
 *
 * `useScroll` and `useInfiniteScroll` both need this, and an `IntersectionObserver`
 * cannot observe a `Window` or a `Document` at all — so the second caller is
 * exactly why these four live in `shared/` instead of beside the first one.
 *
 * @internal
 */
export function scrollElementOf(
	target: object | null | undefined
): HTMLElement | SVGElement | null {
	if (!target) return null;
	if (isWindowLike(target)) return target.document.documentElement;
	if (isDocumentLike(target)) return target.documentElement;
	return isScrollableElement(target) ? target : null;
}
