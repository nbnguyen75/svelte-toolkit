import type { MaybeElement } from '../../shared/element.ts';
import type { MaybeGetter } from '../../shared/getter.ts';

import { useEventListener } from '../../browser/useEventListener/index.ts';
import { resolveGetter } from '../../shared/getter.ts';
import { isBrowser } from '../../shared/is.ts';
import { useMutationObserver } from '../useMutationObserver/index.ts';
import { useResizeObserver } from '../useResizeObserver/index.ts';

/** A viewport-relative box, as reported by `getBoundingClientRect()`. */
interface BoundingBox {
	height: number;
	bottom: number;
	right: number;
	width: number;
	left: number;
	top: number;
	x: number;
	y: number;
}

/**
 * Options for {@link useElementBounding}.
 *
 * Every property accepts `undefined`, so a Svelte
 * `let windowScroll = $state<boolean>()` can be forwarded straight through.
 */
export interface UseElementBoundingOptions {
	/**
	 * When to run the measurement itself.
	 *
	 * `'next-frame'` defers it by one frame, which matters when something else
	 * on this tick changes the layout — `useBreakpoints`, a class swap — and the
	 * box you want is the one after that layout settles.
	 * @default 'sync'
	 */
	updateTiming?: 'sync' | 'next-frame' | undefined;
	/** Re-measure on `window` resize. @default true */
	windowResize?: boolean | undefined;
	/** Re-measure on `scroll`, at the capture phase, so any scroller counts. @default true */
	windowScroll?: boolean | undefined;
	/**
	 * Zero every value when the element goes away, instead of leaving the last
	 * box on screen.
	 * @default true
	 */
	reset?: boolean | undefined;
}

/** Reactive state returned by {@link useElementBounding}. */
export interface UseElementBoundingReturn extends BoundingBox {
	/** Re-measure now (or next frame, per `updateTiming`). */
	update: () => void;
}

const emptyBox = (): BoundingBox => ({
	height: 0,
	bottom: 0,
	left: 0,
	right: 0,
	top: 0,
	width: 0,
	x: 0,
	y: 0
});

/**
 * Reactive bounding box of an HTML element.
 *
 * Must be called in component initialization — it composes
 * {@link useResizeObserver} and {@link useMutationObserver}. The three inputs are
 * the ones that can move a box without the page scrolling: a resize, a `style` or
 * `class` change, and window scroll/resize.
 *
 * Every value is viewport-relative (`getBoundingClientRect`), not document
 * coordinates, so add `window.scrollY` / `scrollX` if you need document space.
 *
 * @param target Element to measure, or a getter returning it.
 * @param options `reset`, `windowResize`, `windowScroll`, `updateTiming`.
 * @returns `height`, `bottom`, `left`, `right`, `top`, `width`, `x`, `y`, `update`.
 * @example
 * ```ts
 * const box = useElementBounding(() => card);
 * console.log(box.width, box.height);
 * ```
 */
export function useElementBounding(
	target: MaybeGetter<MaybeElement>,
	options: UseElementBoundingOptions = {}
): UseElementBoundingReturn {
	const { reset = true, windowResize = true, windowScroll = true, updateTiming = 'sync' } = options;

	let box = $state<BoundingBox>(emptyBox());

	function recalculate() {
		const el = resolveGetter(target);
		if (!el) {
			if (reset) box = emptyBox();
			return;
		}
		const rect = el.getBoundingClientRect();
		box = {
			height: rect.height,
			bottom: rect.bottom,
			left: rect.left,
			right: rect.right,
			top: rect.top,
			width: rect.width,
			x: rect.x,
			y: rect.y
		};
	}

	function update() {
		if (updateTiming === 'sync') recalculate();
		// `update` is public, so it can be called where there is no frame to
		// schedule on - under SSR, or before the element exists.
		else if (isBrowser) requestAnimationFrame(recalculate);
	}

	useResizeObserver(target, update);

	// A `style` or `class` change moves the box with no resize and no scroll,
	// which is why only those two attributes are watched.
	useMutationObserver(target, update, { attributeFilter: ['style', 'class'] });

	if (windowScroll) {
		// Capture phase: a scroll on any descendant bubbles, and a non-bubbling
		// scroll on an element deep in the tree does not reach `window` at all.
		useEventListener(() => (isBrowser ? window : null), 'scroll', update, {
			capture: true,
			passive: true
		});
	}
	if (windowResize) {
		useEventListener(() => (isBrowser ? window : null), 'resize', update, { passive: true });
	}

	$effect(() => {
		// The observers stop watching when the element goes, so nothing else
		// would report the zeroes.
		if (!resolveGetter(target)) update();
	});

	return {
		get height() {
			return box.height;
		},
		get bottom() {
			return box.bottom;
		},
		get left() {
			return box.left;
		},
		get right() {
			return box.right;
		},
		get top() {
			return box.top;
		},
		get width() {
			return box.width;
		},
		get x() {
			return box.x;
		},
		get y() {
			return box.y;
		},
		update
	};
}
