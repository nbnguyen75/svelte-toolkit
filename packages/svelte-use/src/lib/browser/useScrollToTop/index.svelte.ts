import type { MaybeGetter } from '../../shared/getter.ts';

import { cubicOut } from 'svelte/easing';
import { Tween } from 'svelte/motion';

import { resolveGetter } from '../../shared/getter.ts';
import { isBrowser } from '../../shared/is.ts';

/**
 * Window detection without `instanceof` (which fails across realms: iframes,
 * and test runners that evaluate modules in separate VM contexts). A
 * scrollable element never carries a numeric `scrollY`.
 */
function isWindowLike(el: Window | HTMLElement): el is Window {
	return 'scrollY' in el && typeof el.scrollY === 'number';
}

/** Options for {@link useScrollToTop}. */
export interface UseScrollToTopOptions {
	/**
	 * Easing applied to the tween progress.
	 * @default cubicOut
	 */
	easing?: (t: number) => number;
	/**
	 * Animation duration in milliseconds.
	 * @default 400
	 */
	duration?: number;
}

/** Controls returned by {@link useScrollToTop}. */
export interface UseScrollToTopReturn {
	/**
	 * Tween scroll position to `0`. Resolves when the animation completes;
	 * resolves without writing when superseded by a newer call or `cancel()`.
	 * No-op (resolves immediately) during SSR or without a target.
	 */
	scrollToTop: () => Promise<void>;
	/** Whether an animation is currently running. Getter-backed (destructure-safe). */
	readonly scrolling: boolean;
	/** Abort any in-flight animation. Safe to call when idle. */
	cancel: () => void;
}

/**
 * Reads current scroll offset: `scrollY` for a window, `scrollTop` for an
 * element.
 */
function getScrollTop(el: Window | HTMLElement): number {
	return isWindowLike(el) ? el.scrollY : el.scrollTop;
}

/** Writes a scroll offset: `scrollTo` for a window, `scrollTop` for an element. */
function setScrollTop(el: Window | HTMLElement, top: number): void {
	if (isWindowLike(el)) el.scrollTo(0, top);
	else el.scrollTop = top;
}

/**
 * Animated scroll-to-top controls for `window` or a scrollable element.
 * Must be called in component initialization (uses `$state` / `$effect`;
 * unmounting cancels any in-flight animation).
 *
 * @param target Scroll container, or a getter for it. Defaults to `window` in browsers.
 * @param options `duration` and `easing` for the tween.
 * @returns `scrollToTop`, `cancel`, and getter-backed `scrolling`.
 * @example
 * ```ts
 * import { useScrollToTop } from '@wynn-dev/svelte-use';
 *
 * const { scrollToTop, scrolling } = useScrollToTop();
 * await scrollToTop();
 * ```
 */
export function useScrollToTop(
	target: MaybeGetter<Window | HTMLElement | null | undefined> = () =>
		isBrowser ? window : undefined,
	options: UseScrollToTopOptions = {}
): UseScrollToTopReturn {
	const { duration = 400, easing = cubicOut } = options;

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

	async function scrollToTop(): Promise<void> {
		if (!isBrowser) return;
		const el = resolveGetter(target);
		if (!el) return;

		cancel();
		const id = ++runId;

		const progress = new Tween(getScrollTop(el), { duration, easing });
		scrolling = true;

		const stop = $effect.root(() => {
			$effect(() => {
				setScrollTop(el, progress.current);
			});
		});
		stopRoot = stop;

		try {
			await progress.set(0);
		} finally {
			// Stale runs (superseded or cancelled) must not touch shared state.
			if (id === runId) {
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
		scrollToTop
	};
}
