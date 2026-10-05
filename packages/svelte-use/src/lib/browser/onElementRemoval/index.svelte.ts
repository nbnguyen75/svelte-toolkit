import type { MaybeGetter } from '../../shared/getter.ts';

import { useMutationObserver } from '../../elements/useMutationObserver/index.ts';
import { resolveGetter } from '../../shared/getter.ts';
import { isBrowser } from '../../shared/is.ts';

/**
 * Did any of these removals take `node` out of the document?
 *
 * `removed === node` covers the direct case; `removed.contains(node)` covers the
 * indirect one where an ancestor was removed, which is the case that matters for
 * anything inside a list.
 */
function removedElement(records: MutationRecord[], node: Node): boolean {
	return records
		.flatMap((record) => [...record.removedNodes])
		.some((removed) => removed === node || removed.contains(node));
}

/** Options for {@link onElementRemoval}. */
export interface OnElementRemovalOptions {
	/**
	 * Document to watch, or a getter re-resolved on every effect run. Defaults
	 * to the global `document`, and is skipped when there is none.
	 */
	document?: MaybeGetter<Document | null | undefined>;
}

/**
 * Calls `callback` when the element, or any ancestor of it, leaves the DOM.
 *
 * A `MutationObserver` cannot watch an element for its own removal - once it is
 * detached nothing observes it - so this watches `document` with `subtree: true`
 * and checks each batch of removed nodes instead.
 *
 * Must be called in component initialization (uses `$effect`, via
 * {@link useMutationObserver}).
 *
 * @param target Element to watch, or a getter re-resolved on every effect run.
 * @param callback Called with the records that removed it, if any.
 * @param options `document`.
 * @returns `stop()`, which stops watching. Safe to call off the browser.
 * @example
 * ```ts
 * const stop = onElementRemoval(() => node, () => console.log('removed'));
 * stop();
 * ```
 */
export function onElementRemoval(
	target: MaybeGetter<Node | null | undefined>,
	callback: (records: MutationRecord[]) => void,
	options: OnElementRemovalOptions = {}
): () => void {
	// Both read inside deriveds rather than once at setup, so a `bind:this` that
	// resolves later is watched instead of being silently skipped.
	const element = $derived(resolveGetter(target));
	const doc = $derived.by(() => {
		const resolved = resolveGetter(options.document);
		return resolved === undefined ? (isBrowser ? document : null) : resolved;
	});

	// Not inside an effect: `useMutationObserver` owns its own `$effect`, and
	// Svelte forbids creating one within another. Its target getter is the switch
	// instead - `null` means "observe nothing", which is how a missing document
	// reads.
	//
	// `element` is read in the *target* getter, not only in the callback, and that
	// is what makes a late `bind:this` work. The callback runs outside any
	// reactive context, so a value read only there is never tracked and the
	// observer would never re-arm; read here, the observer's own effect
	// subscribes and re-observes when the element appears.
	const observer = useMutationObserver(
		() => (element ? (doc?.body ?? doc?.documentElement ?? null) : null),
		(records) => {
			if (element && removedElement(records, element)) callback(records);
		},
		{ childList: true, subtree: true }
	);

	return observer.stop;
}
