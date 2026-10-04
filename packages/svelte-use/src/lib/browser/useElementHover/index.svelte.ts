import type { MaybeGetter } from '../../shared/getter.ts';

import { resolveGetter } from '../../shared/getter.ts';
import { isBrowser, noop } from '../../shared/is.ts';
import { useEventListener } from '../useEventListener/index.svelte.ts';

/** Element whose hover state is tracked. */
export type UseElementHoverTarget = Element | null | undefined;

/** Options for {@link useElementHover}. */
export interface UseElementHoverOptions {
	/**
	 * Also report "not hovered" when the element is removed from the DOM. A
	 * removed element gets no `mouseleave`, so without this a hovered tooltip
	 * would stay visible forever.
	 * @default false
	 */
	triggerOnRemoval?: boolean;
	/**
	 * Ms to wait before reporting hover. Lets a tooltip ignore a pointer that
	 * merely crosses the element.
	 * @default 0
	 */
	delayEnter?: number;
	/**
	 * Ms to wait before reporting the pointer left.
	 * @default 0
	 */
	delayLeave?: number;
}

/**
 * Reactive hover state for an element, with optional enter / leave delays. Must
 * be called in component initialization (uses `$state` / `$effect`).
 *
 * @param element Element to track, or a getter re-resolved on every effect run.
 * @param options `delayEnter`, `delayLeave`, `triggerOnRemoval`.
 * @returns Getter-backed `isHovered`.
 * @example
 * ```ts
 * const isHovered = useElementHover(() => panel, { delayEnter: 200 });
 *
 * console.log(isHovered.value); // false until the pointer settles
 * ```
 */
export function useElementHover(
	element: MaybeGetter<UseElementHoverTarget>,
	options: UseElementHoverOptions = {}
): { readonly value: boolean } {
	const { delayEnter = 0, delayLeave = 0, triggerOnRemoval = false } = options;

	let isHovered = $state(false);

	// Plain variable, not `$state`: nothing renders from it, and the unmount
	// teardown has to reach it without reading reactive state.
	let timer: ReturnType<typeof setTimeout> | null = null;

	/**
	 * A pending toggle is always cancelled rather than queued, so a pointer that
	 * crosses an element quickly never leaves a stale hover behind.
	 */
	function toggle(hovered: boolean): void {
		if (timer !== null) {
			clearTimeout(timer);
			timer = null;
		}

		const delay = hovered ? delayEnter : delayLeave;
		if (delay > 0) {
			timer = setTimeout(() => {
				timer = null;
				isHovered = hovered;
			}, delay);
			return;
		}

		isHovered = hovered;
	}

	const passive = { passive: true };

	useEventListener(
		() => (isBrowser ? resolveGetter(element) : null),
		'mouseenter',
		() => toggle(true),
		passive
	);
	useEventListener(
		() => (isBrowser ? resolveGetter(element) : null),
		'mouseleave',
		() => toggle(false),
		passive
	);

	$effect(() => {
		if (!triggerOnRemoval || !isBrowser) return noop;
		const target = resolveGetter(element);
		if (!target) return noop;
		// ponytail: observes `document`, not an element, so feat-017's
		// useMutationObserver (which takes elements) does not fit - widening its
		// target to Node for this one callsite would cost more than it saves.
		const observer = new MutationObserver((records) => {
			const removed = records.flatMap((record) => [...record.removedNodes]);
			// A removal is either the element itself or an ancestor that took it
			// down with it.
			if (removed.some((node) => node === target || node.contains(target))) {
				toggle(false);
			}
		});
		observer.observe(document, { childList: true, subtree: true });
		return () => {
			observer.disconnect();
		};
	});

	// A pending toggle must not fire after teardown. Cancels the timer only:
	// reading `isHovered` in an unmount teardown would see the pre-destroy
	// value, and there is nothing to cancel it for.
	$effect(() => {
		return () => {
			if (timer !== null) clearTimeout(timer);
		};
	});

	return {
		get value() {
			return isHovered;
		}
	};
}
