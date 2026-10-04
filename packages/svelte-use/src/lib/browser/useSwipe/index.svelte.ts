import type { MaybeGetter } from '../../shared/getter.ts';
import type { Position } from '../../shared/types.ts';

import { resolveGetter } from '../../shared/getter.ts';
import { isTouchEvent, isBrowser, noop } from '../../shared/is.ts';
import { bindListener } from '../useEventListener/bind.ts';

/** Which way a swipe went, or `'none'` before it has travelled far enough. */
export type UseSwipeDirection = 'up' | 'down' | 'left' | 'right' | 'none';

/** Options for {@link useSwipe}. */
export interface UseSwipeOptions {
	/** Called when the finger lifts, with the direction it ended on. */
	onSwipeEnd?: (event: TouchEvent, direction: UseSwipeDirection) => void;
	/**
	 * How far the finger must travel, in pixels, before it counts as a swipe.
	 * Defaults to `50`. Read per event, so a getter takes effect immediately.
	 */
	threshold?: MaybeGetter<number | undefined>;
	/**
	 * Bind the listeners as passive, which is faster but makes `preventDefault`
	 * impossible — a passive listener's `preventDefault()` is ignored by the
	 * browser. Turning it off is what lets a horizontal swipe stop the page from
	 * scrolling sideways. Defaults to `true`.
	 *
	 * Read when the listeners bind, so a getter takes effect by re-binding.
	 */
	passive?: MaybeGetter<boolean | undefined>;
	/** Called on the touch that starts a swipe, before any threshold is met. */
	onSwipeStart?: (event: TouchEvent) => void;
	/** Called on each move, once the threshold has been met. */
	onSwipe?: (event: TouchEvent) => void;
}

/** Reactive swipe state returned by {@link useSwipe}. */
export interface UseSwipeReturn {
	/** Where the touch began. */
	readonly coordsStart: Readonly<Position>;
	/** Where the touch last was. */
	readonly coordsEnd: Readonly<Position>;
	/** Which way it went, or `'none'` below the threshold. */
	readonly direction: UseSwipeDirection;
	/** Whether the threshold has been met and the finger is still down. */
	readonly isSwiping: boolean;
	/**
	 * How far it travelled horizontally: positive to the left, negative to the
	 * right. Signed, because "travelled 30 left" and "travelled 30 right" are
	 * different answers.
	 */
	readonly lengthX: number;
	/** How far it travelled vertically. Positive up, negative down. */
	readonly lengthY: number;
	/** Stop listening now. The util does not start again until `target` changes. */
	stop: () => void;
}

/** Module-scope immutable constant, safe to evaluate during SSR (`scope.md` §2). */
const DEFAULT_THRESHOLD = 50;

/**
 * The first touch, or `undefined` when there is none. `noUncheckedIndexedAccess`
 * makes the index lookup optional even after a length check, so this asks
 * instead of asserting.
 */
function touchPoint(event: TouchEvent): Position | undefined {
	const [touch] = event.touches;
	return touch && { x: touch.clientX, y: touch.clientY };
}

/**
 * Reactive swipe detection: which way a touch travelled, and how far.
 *
 * Must be called in component initialization (uses `$state` / `$derived` /
 * `$effect`).
 *
 * @param target Element or `EventTarget` to listen on, or a getter re-resolved
 * on every effect run.
 * @param options `passive`, `threshold`, `onSwipeStart`, `onSwipe`,
 * `onSwipeEnd`.
 * @returns Getter-backed `isSwiping`, `direction`, `coordsStart`, `coordsEnd`,
 * `lengthX`, `lengthY`, and `stop()`.
 * @example
 * ```ts
 * const swipe = useSwipe(() => carousel, { threshold: 30 });
 * ```
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useSwipe } from '@wynn-dev/svelte-use';
 *
 *   let el: HTMLDivElement;
 *   const swipe = useSwipe(() => el, {
 *     // Non-passive, so a horizontal swipe can stop the page scrolling.
 *     passive: false,
 *     onSwipeEnd: (_, direction) => {
 *       if (direction === 'left') next();
 *       else if (direction === 'right') previous();
 *     }
 *   });
 * </script>
 *
 * <div bind:this={el}>{swipe.isSwiping ? swipe.direction : 'idle'}</div>
 * ```
 */
export function useSwipe(
	target: MaybeGetter<EventTarget | null | undefined>,
	options: UseSwipeOptions = {}
): UseSwipeReturn {
	// Replaced wholesale, never mutated, so `raw` is the honest wrapper: reading
	// the variable is the whole dependency.
	let coordsStart = $state.raw<Position>({ x: 0, y: 0 });
	let coordsEnd = $state.raw<Position>({ x: 0, y: 0 });
	let isSwiping = $state(false);

	// start minus end, so a positive length means the finger went the other way.
	const diffX = $derived(coordsStart.x - coordsEnd.x);
	const diffY = $derived(coordsStart.y - coordsEnd.y);
	// The threshold is read here rather than in a derived of its own, and that is
	// load-bearing: a `$derived` caches, so one wrapping only the option would
	// keep returning its first value and a getter returning a new threshold would
	// be ignored forever. Read inside this derived it is re-read on every move,
	// which is the only moment it matters.
	const isThresholdExceeded = $derived(
		Math.max(Math.abs(diffX), Math.abs(diffY)) >=
			(resolveGetter(options.threshold) ?? DEFAULT_THRESHOLD)
	);

	const direction = $derived.by((): UseSwipeDirection => {
		if (!isThresholdExceeded) return 'none';
		if (Math.abs(diffX) > Math.abs(diffY)) return diffX > 0 ? 'left' : 'right';
		return diffY > 0 ? 'up' : 'down';
	});

	function onTouchStart(event: Event): void {
		if (!isTouchEvent(event)) return;
		// A second finger is a pinch, not a swipe.
		if (event.touches.length !== 1) return;
		const point = touchPoint(event);
		if (!point) return;
		coordsStart = point;
		coordsEnd = point;
		options.onSwipeStart?.(event);
	}

	function onTouchMove(event: Event): void {
		if (!isTouchEvent(event)) return;
		if (event.touches.length !== 1) return;
		const point = touchPoint(event);
		if (!point) return;
		coordsEnd = point;
		// Only the horizontal axis: a vertical swipe is a scroll, and stopping
		// that would make the page impossible to scroll from a carousel.
		if (!resolveGetter(options.passive) && Math.abs(diffX) > Math.abs(diffY))
			event.preventDefault();
		if (!isSwiping && isThresholdExceeded) isSwiping = true;
		if (isSwiping) options.onSwipe?.(event);
	}

	function onTouchEnd(event: Event): void {
		if (!isTouchEvent(event)) return;
		if (isSwiping) options.onSwipeEnd?.(event, direction);
		isSwiping = false;
	}

	/** The current binding's detachers, so `stop()` can end it early. */
	let detach: (() => void)[] = [];

	$effect(() => {
		const el = isBrowser ? resolveGetter(target) : null;
		if (!el) {
			detach = [];
			return noop;
		}
		// `passive` must be read here, not at setup: it is fixed when a listener
		// binds, so reading it once would leave a later change silently ignored —
		// and a listener that was bound passive can never preventDefault.
		const passive = resolveGetter(options.passive) ?? true;
		// Capture when not passive, matching VueUse: the only thing needing
		// capture here is the preventDefault above.
		const listenerOptions: AddEventListenerOptions = { passive, capture: !passive };
		detach = [
			bindListener(el, 'touchstart', onTouchStart, listenerOptions),
			bindListener(el, 'touchmove', onTouchMove, listenerOptions),
			bindListener(el, 'touchend', onTouchEnd, listenerOptions),
			bindListener(el, 'touchcancel', onTouchEnd, listenerOptions)
		];
		return () => {
			for (const off of detach) off();
			detach = [];
		};
	});

	function stop(): void {
		for (const off of detach) off();
		detach = [];
	}

	return {
		get isSwiping() {
			return isSwiping;
		},
		get direction() {
			return direction;
		},
		get coordsStart() {
			return coordsStart;
		},
		get coordsEnd() {
			return coordsEnd;
		},
		get lengthX() {
			return diffX;
		},
		get lengthY() {
			return diffY;
		},
		stop
	};
}
