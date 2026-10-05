import type { MaybeGetter } from '../../shared/getter.ts';

import { untrack } from 'svelte';

import { useMutationObserver } from '../../elements/useMutationObserver/index.ts';
import { scrollElementOf, isDocumentLike, isWindowLike } from '../../shared/element.ts';
import { resolveGetter } from '../../shared/getter.ts';
import { isBrowser } from '../../shared/is.ts';
import { useDebounceFn } from '../../utilities/useDebounceFn/index.ts';
import { useThrottleFn } from '../../utilities/useThrottleFn/index.ts';
import { useEventListener } from '../useEventListener/index.svelte.ts';

/**
 * `scrollTop`/`scrollLeft` are unrounded while `clientHeight`/`scrollHeight` are
 * rounded, so "scrolled to the very bottom" almost never compares exactly equal.
 * Without this epsilon, `arrivedState.bottom` flickers on the last pixel.
 */
const ARRIVED_STATE_THRESHOLD_PIXELS = 1;

/** The scroll container whose position is tracked: an element, document, or window. */
export type UseScrollTarget = Document | HTMLElement | SVGElement | Window | null | undefined;

/** Per-edge scroll state. Getter-backed, so `arrivedState.top` stays reactive. */
export interface UseScrollEdges {
	/** Scrolled to (or past) the bottom edge. */
	readonly bottom: boolean;
	/** Scrolled to (or past) the right edge. */
	readonly right: boolean;
	/** Scrolled to (or past) the left edge. */
	readonly left: boolean;
	/** Scrolled to (or past) the top edge. */
	readonly top: boolean;
}

/** Options for {@link useScroll}. */
export interface UseScrollOptions {
	/** Pixels of slack allowed before an edge counts as arrived. */
	offset?: {
		bottom?: number;
		right?: number;
		left?: number;
		top?: number;
	};
	/**
	 * Flags forwarded to `addEventListener` for the scroll listeners.
	 * @default { capture: false, passive: true }
	 */
	eventListenerOptions?: AddEventListenerOptions | boolean;
	/**
	 * Re-measure when the container's DOM changes. Mutation watching is
	 * opt-in: it costs an observer per call.
	 * @default false
	 */
	observe?: boolean | { mutation?: boolean };
	/**
	 * Scroll behavior applied when `x` or `y` is assigned.
	 * @default 'auto'
	 */
	behavior?: MaybeGetter<ScrollBehavior>;
	/**
	 * Called when measuring throws — an initial measure on a detached element,
	 * for instance. Defaults to `console.error`.
	 */
	onError?: (error: unknown) => void;
	/** Called on every scroll event, after the state has been updated. */
	onScroll?: (e: Event) => void;
	/** Called once when scrolling ends. */
	onStop?: (e: Event) => void;
	/**
	 * Milliseconds between scroll-state updates. `0` disables throttling.
	 * @default 0
	 */
	throttle?: number;
	/**
	 * Quiet period after the last scroll event before `isScrolling` flips to
	 * `false`. The debounce delay is `throttle + idle`.
	 * @default 200
	 */
	idle?: number;
}

/** Reactive scroll state returned by {@link useScroll}. */
export interface UseScrollReturn {
	/** Which edges the container currently sits at. */
	readonly arrivedState: UseScrollEdges;
	/** Which way the container moved since the previous measurement. */
	readonly directions: UseScrollEdges;
	/** True between a scroll event and `idle` ms after the last one. */
	readonly isScrolling: boolean;
	/** Re-read the scroll metrics now. Call after content changes the extent. */
	measure: () => void;
	/** Horizontal offset. Assigning scrolls there. */
	x: number;
	/** Vertical offset. Assigning scrolls there. */
	y: number;
}

/**
 * Reactive scroll position and edge state for an element, document, or window.
 * Must be called in component initialization (uses `$state` / `$effect`;
 * unmounting cancels the pending scroll-end timer).
 *
 * @param element Scroll container, or a getter re-resolved on every effect run.
 * @param options `throttle`, `idle`, `offset`, `observe`, `behavior`, `eventListenerOptions`, `onScroll`, `onStop`, `onError`.
 * @returns `x`, `y`, `isScrolling`, `arrivedState`, `directions`, and `measure`.
 * @example
 * ```ts
 * const scroll = useScroll(() => listEl);
 *
 * scroll.y = 400; // jump 400px down
 * if (scroll.arrivedState.bottom) loadMore();
 * ```
 */
export function useScroll(
	element: MaybeGetter<UseScrollTarget>,
	options: UseScrollOptions = {}
): UseScrollReturn {
	const {
		throttle = 0,
		idle = 200,
		offset = {},
		observe: observeOption = false,
		eventListenerOptions = { capture: false, passive: true },
		behavior = 'auto',
		onScroll = () => {},
		onStop = () => {},
		onError = (error: unknown) => {
			console.error(error);
		}
	} = options;

	const observeMutation =
		typeof observeOption === 'boolean' ? observeOption : !!observeOption.mutation;

	let internalX = $state(0);
	let internalY = $state(0);
	let isScrolling = $state(false);
	let arrivedLeft = $state(true);
	let arrivedRight = $state(false);
	let arrivedTop = $state(true);
	let arrivedBottom = $state(false);
	let dirLeft = $state(false);
	let dirRight = $state(false);
	let dirTop = $state(false);
	let dirBottom = $state(false);

	/**
	 * Recompute every edge flag from the container's current metrics.
	 *
	 * VueUse multiplies the horizontal offset by `-1` when `direction === 'rtl'`.
	 * That is dropped on purpose: the surrounding `Math.abs` already normalizes
	 * the sign, so `Math.abs(x * -1) === Math.abs(x)` and the branch could never
	 * change a result. Negative `scrollLeft` values — how browsers report an rtl
	 * container — are handled by the `Math.abs` alone.
	 *
	 * `row-reverse` / `column-reverse` flex containers do need a real swap,
	 * because they genuinely reverse which measurement maps to which edge.
	 */
	function setArrivedState(el: HTMLElement | SVGElement): void {
		const { display, flexDirection } = window.getComputedStyle(el);
		const reversedRow = display === 'flex' && flexDirection === 'row-reverse';
		const reversedColumn = display === 'flex' && flexDirection === 'column-reverse';

		const scrollLeft = el.scrollLeft;
		dirLeft = scrollLeft < internalX;
		dirRight = scrollLeft > internalX;

		const nearLeft = Math.abs(scrollLeft) <= (offset.left ?? 0);
		const nearRight =
			Math.abs(scrollLeft) + el.clientWidth >=
			el.scrollWidth - (offset.right ?? 0) - ARRIVED_STATE_THRESHOLD_PIXELS;
		arrivedLeft = reversedRow ? nearRight : nearLeft;
		arrivedRight = reversedRow ? nearLeft : nearRight;

		internalX = scrollLeft;

		const scrollTop = el.scrollTop;
		dirTop = scrollTop < internalY;
		dirBottom = scrollTop > internalY;

		const nearTop = Math.abs(scrollTop) <= (offset.top ?? 0);
		const nearBottom =
			Math.abs(scrollTop) + el.clientHeight >=
			el.scrollHeight - (offset.bottom ?? 0) - ARRIVED_STATE_THRESHOLD_PIXELS;
		arrivedTop = reversedColumn ? nearBottom : nearTop;
		arrivedBottom = reversedColumn ? nearTop : nearBottom;

		internalY = scrollTop;
	}

	function measure(): void {
		// Guarded before the getter runs, not after: a `() => window` target throws
		// on a server, and `measure()` is public API a caller may invoke directly.
		if (!isBrowser) return;
		const el = scrollElementOf(resolveGetter(element));
		if (el) setArrivedState(el);
	}

	function onScrollEnd(e: Event): void {
		// `scrollend` and the debounced fallback both land here; the flag is what
		// dedupes them.
		if (!isScrolling) return;
		isScrolling = false;
		dirLeft = false;
		dirRight = false;
		dirTop = false;
		dirBottom = false;
		onStop(e);
	}

	const debouncedStop = useDebounceFn(onScrollEnd, throttle + idle);

	function onScrollHandler(e: Event): void {
		if (!isBrowser) return;
		// Chrome fires `scroll` on `document` for viewport scrolls, so the event
		// target is not necessarily the container.
		const el = scrollElementOf(e.target);
		if (el) setArrivedState(el);
		isScrolling = true;
		debouncedStop(e);
		onScroll(e);
	}

	// Built unconditionally so teardown has one shape to cancel; arming costs
	// nothing until it is called.
	const throttled = useThrottleFn(onScrollHandler, throttle);
	const handleScroll = throttle > 0 ? throttled : onScrollHandler;

	useEventListener(() => resolveGetter(element), 'scroll', handleScroll, eventListenerOptions);
	useEventListener(() => resolveGetter(element), 'scrollend', onScrollEnd, eventListenerOptions);

	// Initial measure once the container exists. `untrack` matters: setArrivedState
	// both reads and writes `internalX`/`internalY`, so a tracked call would
	// re-trigger this effect on every scroll.
	$effect(() => {
		const el = scrollElementOf(resolveGetter(element));
		if (!isBrowser || !el) return;
		try {
			untrack(() => setArrivedState(el));
		} catch (error) {
			onError(error);
		}
	});

	useMutationObserver(
		() => {
			const target = resolveGetter(element);
			// A window or document is not a valid mutation target, and watching the
			// whole viewport subtree buys nothing.
			if (
				!observeMutation ||
				!isBrowser ||
				!target ||
				isWindowLike(target) ||
				isDocumentLike(target)
			)
				return null;
			return target;
		},
		() => untrack(() => measure()),
		{ attributes: true, childList: true, subtree: true }
	);

	$effect(() => {
		return () => {
			debouncedStop.cancel();
			throttled.cancel();
		};
	});

	function scrollTo(x: number | undefined, y: number | undefined): void {
		if (!isBrowser) return;
		const target = resolveGetter(element);
		const el = scrollElementOf(target);
		if (!target || !el) return;
		// `scrollTo` is absent in jsdom and on some SVG elements; the read-back
		// below still keeps the reported offsets honest.
		if ('scrollTo' in target) {
			target.scrollTo({
				top: y ?? internalY,
				left: x ?? internalX,
				behavior: resolveGetter(behavior)
			});
		}
		internalX = el.scrollLeft;
		internalY = el.scrollTop;
	}

	const arrivedState: UseScrollEdges = {
		get bottom() {
			return arrivedBottom;
		},
		get left() {
			return arrivedLeft;
		},
		get right() {
			return arrivedRight;
		},
		get top() {
			return arrivedTop;
		}
	};

	const directions: UseScrollEdges = {
		get bottom() {
			return dirBottom;
		},
		get left() {
			return dirLeft;
		},
		get right() {
			return dirRight;
		},
		get top() {
			return dirTop;
		}
	};

	return {
		arrivedState,
		directions,
		get isScrolling() {
			return isScrolling;
		},
		measure,
		get x() {
			return internalX;
		},
		set x(value: number) {
			scrollTo(value, undefined);
		},
		get y() {
			return internalY;
		},
		set y(value: number) {
			scrollTo(undefined, value);
		}
	};
}
