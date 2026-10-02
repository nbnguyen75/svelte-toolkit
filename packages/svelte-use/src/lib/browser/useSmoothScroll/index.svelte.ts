import type { MaybeGetter } from '../../shared/getter.ts';

import { cubicOut } from 'svelte/easing';
import { prefersReducedMotion, Tween } from 'svelte/motion';

import { resolveGetter } from '../../shared/getter.ts';
import { isBrowser } from '../../shared/is.ts';

/** Scroll container or a getter for it. */
export type ScrollContainer = MaybeGetter<Window | HTMLElement | null | undefined>;

/** Scroll destination: an offset, or an element to bring into view. */
export type ScrollTarget = number | Element | null | undefined;

/** Options for {@link useSmoothScroll}. */
export interface UseSmoothScrollOptions {
	/**
	 * Abort an in-flight animation when the user scrolls, scrolls with a wheel or
	 * trackpad, or presses a scrolling key, so the page does not snap back to a
	 * stale offset.
	 * @default true
	 */
	interruptOnUserScroll?: boolean;
	/**
	 * Easing applied to the tween progress.
	 * @default cubicOut
	 */
	easing?: (t: number) => number;
	/**
	 * Animation duration in milliseconds. Forced to `0` while the user prefers
	 * reduced motion.
	 * @default 400
	 */
	duration?: number;
}

/** Per-call overrides for {@link useSmoothScrollReturn.scrollTo}. */
export interface UseSmoothScrollCallOptions {
	/**
	 * Easing applied to the tween progress.
	 */
	easing?: (t: number) => number;
	/**
	 * Scroll container holding `target`. Defaults to the one bound at init.
	 */
	container?: ScrollContainer;
	/**
	 * Animation duration in milliseconds. Forced to `0` while the user prefers
	 * reduced motion.
	 */
	duration?: number;
}

/** Controls returned by {@link useSmoothScroll}. */
export interface UseSmoothScrollReturn {
	/**
	 * Tween the container to `target`. Resolves when the animation completes;
	 * resolves without writing when superseded by a newer call, `cancel()`, or
	 * interrupted by the user. No-op (resolves immediately) during SSR or when
	 * `target` is empty.
	 */
	scrollTo: (target: ScrollTarget, options?: UseSmoothScrollCallOptions) => Promise<void>;
	/** Whether an animation is currently running. Getter-backed (destructure-safe). */
	readonly scrolling: boolean;
	/** Abort any in-flight animation. Safe to call when idle. */
	cancel: () => void;
}

/**
 * Window detection without `instanceof` (which fails across realms: iframes,
 * and test runners that evaluate modules in separate VM contexts). A
 * scrollable element never carries a numeric `scrollY`.
 */
function isWindowLike(el: Window | HTMLElement): el is Window {
	return 'scrollY' in el && typeof el.scrollY === 'number';
}

/** Reads current scroll offset: `scrollY` for a window, `scrollTop` for an element. */
function getScrollTop(el: Window | HTMLElement): number {
	return isWindowLike(el) ? el.scrollY : el.scrollTop;
}

/** Writes a scroll offset: `scrollTo` for a window, `scrollTop` for an element. */
function setScrollTop(el: Window | HTMLElement, top: number): void {
	if (isWindowLike(el)) el.scrollTo(0, top);
	else el.scrollTop = top;
}

/**
 * User intent signals that should abort a programmatic scroll. `keydown` is not
 * filtered here: keys without a scrolling effect cancel harmlessly, and
 * filtering would only trade a rare abort for a missed interrupt.
 */
const INTERRUPT_EVENTS = ['wheel', 'touchstart', 'keydown'] as const;

/**
 * Tween-based scrolling for `window` or a scrollable element. Must be called in
 * component initialization (uses `$state` / `$effect`; unmounting cancels any
 * in-flight animation).
 *
 * @param container Scroll container, or a getter for it. Defaults to `window`
 * in browsers. Also the fallback container when `scrollTo` gets an element.
 * @param options `container`, `duration`, `easing`, `interruptOnUserScroll`.
 * @returns `scrollTo`, `cancel`, and getter-backed `scrolling`.
 * @example
 * ```ts
 * import { useSmoothScroll } from '@wynn-dev/svelte-use';
 *
 * const { scrollTo, scrolling, cancel } = useSmoothScroll();
 *
 * await scrollTo(0); // back to the top
 * await scrollTo(100, { container: listEl }); // 100px inside a scroll frame
 * await scrollTo(section, { duration: 600 }); // an element into view
 * ```
 */
export function useSmoothScroll(
	container: ScrollContainer = () => (isBrowser ? window : undefined),
	options: UseSmoothScrollOptions = {}
): UseSmoothScrollReturn {
	const { duration = 400, easing = cubicOut, interruptOnUserScroll = true } = options;

	let scrolling = $state(false);
	let stopRoot: (() => void) | undefined;
	let runId = 0;

	function cancel(): void {
		runId += 1;
		if (stopRoot) {
			stopRoot();
			stopRoot = undefined;
		}
		scrolling = false;
	}

	$effect(() => {
		return () => cancel();
	});

	async function scrollTo(
		target: ScrollTarget,
		callOptions: UseSmoothScrollCallOptions = {}
	): Promise<void> {
		if (!isBrowser || target === null || target === undefined) return;

		const el = resolveGetter(callOptions.container ?? container);
		if (!el) return;

		// An element target lands on its offset inside `el`; a number is already
		// expressed in that container's coordinates.
		const to =
			typeof target === 'number'
				? target
				: (() => {
						const rect = target.getBoundingClientRect();
						if (!isWindowLike(el)) {
							return rect.top - el.getBoundingClientRect().top + el.scrollTop;
						}
						return rect.top + window.scrollY;
					})();

		cancel();
		const id = ++runId;

		// Reduced motion is honoured by dropping the tween rather than guessing a
		// shorter duration: one synchronous write is the accessible behaviour.
		// (The `!isBrowser` guard above already kept SSR out of this path.)
		const reduced = prefersReducedMotion.current;
		const progress = new Tween(getScrollTop(el), {
			duration: reduced ? 0 : (callOptions.duration ?? duration),
			easing: callOptions.easing ?? easing
		});
		scrolling = true;

		const stop = $effect.root(() => {
			$effect(() => {
				setScrollTop(el, progress.current);
			});
		});
		stopRoot = stop;

		let onUserScroll: (() => void) | undefined;
		if (interruptOnUserScroll && !reduced) {
			onUserScroll = () => cancel();
			for (const type of INTERRUPT_EVENTS) {
				window.addEventListener(type, onUserScroll, { passive: true });
			}
		}

		try {
			await progress.set(to);
		} finally {
			// Stale runs (superseded or cancelled) must not touch shared state.
			if (id === runId) {
				if (onUserScroll) {
					for (const type of INTERRUPT_EVENTS) {
						window.removeEventListener(type, onUserScroll);
					}
				}
				stop();
				if (stopRoot === stop) stopRoot = undefined;
				scrolling = false;
			}
		}
	}

	return {
		cancel,
		get scrolling() {
			return scrolling;
		},
		scrollTo
	};
}
