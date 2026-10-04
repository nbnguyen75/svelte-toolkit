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
