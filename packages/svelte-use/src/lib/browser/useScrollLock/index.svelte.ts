import type { MaybeGetter } from '../../shared/getter.ts';

import { untrack } from 'svelte';

import { resolveGetter } from '../../shared/getter.ts';
import { isBrowser, isIOS } from '../../shared/is.ts';

/** Element, window, or document whose scrolling is locked. */
export type UseScrollLockTarget = HTMLElement | SVGElement | Window | Document | null | undefined;

/** Lock state returned by {@link useScrollLock}. */
export interface UseScrollLockReturn {
	/**
	 * Whether the target is locked. Writable: assigning `true` locks and
	 * assigning `false` unlocks, so `bind:` works.
	 */
	locked: boolean;
}

/** `Document` guard. `HTMLElement` has a `nodeType` too, so the value is the test. */
function isDocumentNode(target: object): target is Document {
	return 'nodeType' in target && target.nodeType === 9;
}

/** `TouchEvent` guard, so a `touchmove` can be read without an assertion. */
function isTouchEvent(event: Event): event is TouchEvent {
	return 'touches' in event;
}

/**
 * `Element` guard for an event target. Structural, not `instanceof`: an element
 * from another realm — an iframe, a `template` content document — is a real
 * element whose prototype chain does not include this realm's `Element`.
 */
function isElementNode(target: EventTarget | null): target is Element {
	return target !== null && 'nodeType' in target && target.nodeType === 1;
}

/**
 * The element whose inline `overflow` is actually written. A `window` or
 * `document` target resolves to `documentElement`, because that is what the
 * scrollbar and the overflow cascade both live on.
 *
 * Probed structurally rather than with `instanceof`, which is cross-realm
 * unsafe: a `window` is the only thing carrying a `document`.
 */
function lockElementOf(target: UseScrollLockTarget): HTMLElement | SVGElement | null {
	if (!target || !isBrowser) return null;
	if ('document' in target) return target.document.documentElement;
	if (isDocumentNode(target)) return target.documentElement;
	return target;
}

/**
 * True when `element` or one of its ancestors scrolls on its own, in which case
 * a locked page must not swallow the touch — an internally scrollable modal body
 * still has to be usable. Walks up to `<body>`, since locking `<body>` proves
 * nothing about the ancestors above it.
 */
function hasScrollableAncestor(element: Element): boolean {
	for (let node: Element | null = element; node; node = node.parentElement) {
		const { overflowX, overflowY } = window.getComputedStyle(node);
		if (
			overflowX === 'scroll' ||
			overflowY === 'scroll' ||
			(overflowX === 'auto' && node.clientWidth < node.scrollWidth) ||
			(overflowY === 'auto' && node.clientHeight < node.scrollHeight)
		) {
			return true;
		}
		if (node === document.body) return false;
	}
	return false;
}

/**
 * Blocks a page scroll attempt on iOS, where `overflow: hidden` on the document
 * is only a suggestion. Module scope: it captures nothing from a lock, and the
 * listener is only attached for the duration of one lock.
 */
function preventPageTouch(event: Event): void {
	// Multi-touch is a gesture (pinch to zoom), not a scroll attempt.
	if (isTouchEvent(event) && event.touches.length > 1) return;

	// The event target, not the locked element: a modal's own scroll area is
	// a descendant, and locking must not take its scrolling away.
	if (isElementNode(event.target) && hasScrollableAncestor(event.target)) return;

	event.preventDefault();
}

/**
 * Locks scrolling on an element, window, or document by setting inline
 * `overflow: hidden` and restoring the previous value on unlock. Must be called
 * in component initialization (uses `$state` / `$effect`).
 *
 * Unmounting unlocks, so a dismissed modal cannot leave the page unscrollable.
 *
 * @param element Target to lock, or a getter re-resolved on every effect run.
 * @param initialState Whether to start locked.
 * @returns Writable getter-backed `locked`.
 * @example
 * ```ts
 * const scrollLock = useScrollLock(() => document.body);
 *
 * scrollLock.locked = true; // page stops scrolling
 * scrollLock.locked = false;
 * ```
 */
export function useScrollLock(
	element: MaybeGetter<UseScrollLockTarget>,
	initialState = false
): UseScrollLockReturn {
	let locked = $state(initialState);

	// Plain variables, not `$state`: nothing renders from them, and they must
	// stay writable from a cleanup function that runs after the component is gone.
	let lockedElement: HTMLElement | SVGElement | null = null;
	let initialOverflow: string | null = null;
	let stopTouchMove: (() => void) | null = null;

	function target(): HTMLElement | SVGElement | null {
		return lockElementOf(isBrowser ? resolveGetter(element) : null);
	}

	function hide(el: HTMLElement | SVGElement): void {
		lockedElement = el;
		initialOverflow = el.style.overflow;
		el.style.overflow = 'hidden';
	}

	function restore(): void {
		stopTouchMove?.();
		stopTouchMove = null;
		if (lockedElement && initialOverflow !== null) lockedElement.style.overflow = initialOverflow;
		lockedElement = null;
		initialOverflow = null;
	}

	function lock(): void {
		const el = target();
		if (!el || locked) return;
		hide(el);
		// iOS ignores `overflow: hidden` on the page, so the touch has to be
		// blocked at the event. Attached per lock rather than for the component's
		// lifetime, because a non-passive listener costs scroll performance.
		if (isIOS()) {
			el.addEventListener('touchmove', preventPageTouch, { passive: false });
			stopTouchMove = () => {
				// Only `capture` is meaningful for removal, and it was false.
				el.removeEventListener('touchmove', preventPageTouch);
			};
		}
		locked = true;
	}

	function unlock(): void {
		if (!locked) return;
		restore();
		locked = false;
	}

	// The target can be swapped while locked (a `bind:this` that lands late, a
	// route change). Follow it, and put the previous element back rather than
	// leaving it stuck at `overflow: hidden`.
	$effect(() => {
		const el = target();
		untrack(() => {
			if (!locked || el === lockedElement) return;
			restore();
			if (el) hide(el);
		});
	});

	// Teardown restores from the plain variables rather than calling `unlock()`,
	// because a `$state` read inside an unmount teardown sees the component's
	// pre-destroy value: `unlock()`'s `if (!locked) return` guard would read
	// `false` for a lock that is still in effect and skip the restore, stranding
	// the page unscrollable. `restore()` is a no-op when nothing was locked.
	$effect(() => {
		return () => {
			restore();
		};
	});

	return {
		get locked() {
			return locked;
		},
		set locked(next: boolean) {
			if (next) lock();
			else unlock();
		}
	};
}
