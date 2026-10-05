import type { MaybeGetter } from '../../shared/getter.ts';
import type { Position } from '../../shared/types.ts';
import type { UseSwipeDirection } from '../useSwipe/index.ts';

import { resolveGetter } from '../../shared/getter.ts';
import { isPointerEvent, isBrowser, noop } from '../../shared/is.ts';
import { bindListener } from '../useEventListener/bind.ts';

/** Pointer kinds a swipe listens for, matching the CSS pointer names. */
export type PointerSwipePointerType = 'mouse' | 'touch' | 'pen';

/** Options for {@link usePointerSwipe}. */
export interface UsePointerSwipeOptions {
	/** Called when the pointer lifts, with the direction it ended on. */
	onSwipeEnd?: (event: PointerEvent, direction: UseSwipeDirection) => void;
	/** Called on the pointerdown that starts a swipe, before any threshold is met. */
	onSwipeStart?: (event: PointerEvent) => void;
	/**
	 * How far the pointer must travel, in pixels, before it counts as a swipe.
	 * Defaults to `50`. Read on every move, so a getter takes effect immediately.
	 */
	threshold?: MaybeGetter<number | undefined>;
	/**
	 * Pointer kinds to accept. Without it, any pointer with the primary button
	 * down counts, and a touch counts while it is touching.
	 */
	pointerTypes?: PointerSwipePointerType[];
	/** Called on each move, once the threshold has been met. */
	onSwipe?: (event: PointerEvent) => void;
	/**
	 * Set `user-select: none` on the target, so dragging a carousel does not
	 * highlight the text it moves over.
	 *
	 * @default false
	 */
	disableTextSelect?: boolean;
}

/** Reactive pointer swipe state returned by {@link usePointerSwipe}. */
export interface UsePointerSwipeReturn {
	/** Which way it went, or `'none'` below the threshold. */
	readonly direction: UseSwipeDirection;
	/** Where the pointer went down. */
	readonly posStart: Readonly<Position>;
	/** Where the pointer last was. */
	readonly posEnd: Readonly<Position>;
	/** Whether the threshold has been met and the pointer is still down. */
	readonly isSwiping: boolean;
	/**
	 * How far it travelled horizontally: positive to the left, negative to the
	 * right. Signed, because "travelled 30 left" and "travelled 30 right" are
	 * different answers.
	 */
	readonly distanceX: number;
	/** How far it travelled vertically. Positive up, negative down. */
	readonly distanceY: number;
	/** Stop listening now. The util does not start again until `target` changes. */
	stop: () => void;
}

/** Module-scope immutable constant, safe to evaluate during SSR (`scope.md` §2). */
const DEFAULT_THRESHOLD = 50;

/**
 * The parts of `Element` this util touches, as optional properties.
 *
 * `target` is typed `EventTarget` for parity with `useSwipe`, but a swipe needs
 * `style` and `setPointerCapture`, which only some targets carry.
 */
interface SwipeSurface {
	readonly setPointerCapture?: ((pointerId: number) => void) | undefined;
	readonly style?: CSSStyleDeclaration | undefined;
}

/**
 * Narrows an `EventTarget` to the optional `Element` surface this util uses.
 *
 * Probed structurally, matching the other guards in `shared/is.ts`:
 * `instanceof Element` misses nodes from another realm (an iframe). A target
 * with neither property is legal input, so returning `false` is a skip, not an
 * error.
 */
function isSwipeSurface(value: EventTarget): value is EventTarget & SwipeSurface {
	return 'style' in value || 'setPointerCapture' in value;
}

/**
 * Reactive swipe detection from `PointerEvent`s, which unifies mouse, touch and
 * pen.
 *
 * Must be called in component initialization.
 *
 * @param target Element or `EventTarget` to listen on, or a getter re-resolved on every effect run.
 * @param options `threshold`, `pointerTypes`, `disableTextSelect`, `onSwipeStart`, `onSwipe`, `onSwipeEnd`.
 * @returns `isSwiping`, `direction`, `posStart`, `posEnd`, `distanceX`, `distanceY`, and `stop()`.
 * @example
 * ```svelte
 * <script lang="ts">
 * 	import { usePointerSwipe } from '@wynn-dev/svelte-use';
 *
 * 	let el: HTMLDivElement;
 * 	const swipe = usePointerSwipe(() => el, {
 * 		threshold: 30,
 * 		disableTextSelect: true,
 * 		onSwipeEnd: (_, direction) => {
 * 			if (direction === 'left') next();
 * 			else if (direction === 'right') previous();
 * 		}
 * 	});
 * </script>
 *
 * <div bind:this={el}>{swipe.direction}</div>
 * ```
 */
export function usePointerSwipe(
	target: MaybeGetter<EventTarget | null | undefined>,
	options: UsePointerSwipeOptions = {}
): UsePointerSwipeReturn {
	// Replaced wholesale, never mutated, so `raw` is the honest wrapper: reading
	// the variable is the whole dependency.
	let posStart = $state.raw<Position>({ x: 0, y: 0 });
	let posEnd = $state.raw<Position>({ x: 0, y: 0 });
	let isSwiping = $state(false);
	// Not exposed: the swiping flag is the public one, but a move needs to know
	// a button is still down independently of the threshold.
	let isPointerDown = $state(false);

	// start minus end, so a positive distance means the pointer went the other way.
	const diffX = $derived(posStart.x - posEnd.x);
	const diffY = $derived(posStart.y - posEnd.y);
	// The threshold is read here rather than in a derived of its own, and that is
	// load-bearing: a `$derived` caches, so one wrapping only the option would
	// keep returning its first value and a getter returning a new threshold would
	// be ignored forever. Read inside this derived it is re-read on every move.
	const isThresholdExceeded = $derived(
		Math.max(Math.abs(diffX), Math.abs(diffY)) >=
			(resolveGetter(options.threshold) ?? DEFAULT_THRESHOLD)
	);

	const direction = $derived.by((): UseSwipeDirection => {
		if (!isThresholdExceeded) return 'none';
		if (Math.abs(diffX) > Math.abs(diffY)) return diffX > 0 ? 'left' : 'right';
		return diffY > 0 ? 'up' : 'down';
	});

	/**
	 * Without an explicit allow-list, the platform's own signal is used: a mouse
	 * must have a button down, and a touch or pen simply has to be touching.
	 */
	function eventIsAllowed(event: PointerEvent): boolean {
		const allowed = options.pointerTypes;
		// `pointerType` is a plain `string`, so comparing it against the list
		// directly keeps the narrowing honest without asserting it.
		if (allowed) return allowed.some((type) => type === event.pointerType);
		return event.pointerType === 'mouse' ? event.buttons !== 0 : true;
	}

	function onPointerDown(event: Event): void {
		if (!isPointerEvent(event)) return;
		if (!eventIsAllowed(event)) return;
		isPointerDown = true;
		// Without capture, the moves that matter are re-targeted at whatever the
		// pointer ends up over, so a swipe that drifts off the element stops
		// reporting mid-gesture.
		const source = event.target;
		if (source && isSwipeSurface(source)) source.setPointerCapture?.(event.pointerId);
		const point = { x: event.clientX, y: event.clientY };
		posStart = point;
		posEnd = point;
		options.onSwipeStart?.(event);
	}

	function onPointerMove(event: Event): void {
		if (!isPointerEvent(event)) return;
		if (!eventIsAllowed(event)) return;
		if (!isPointerDown) return;
		posEnd = { x: event.clientX, y: event.clientY };
		if (!isSwiping && isThresholdExceeded) isSwiping = true;
		if (isSwiping) options.onSwipe?.(event);
	}

	function onPointerUp(event: Event): void {
		if (!isPointerEvent(event)) return;
		// Deliberately not re-checked with `eventIsAllowed`: a real `pointerup` for
		// a mouse carries `buttons: 0`, so the down-event filter would reject it and
		// the gesture would never reset. The kind was already accepted on
		// `pointerdown`, and `isPointerDown` covers "no gesture to end".
		if (isSwiping) options.onSwipeEnd?.(event, direction);
		isPointerDown = false;
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
		// `EventTarget` has no `style`, and not every target is an `HTMLElement` -
		// `SVGElement` has `style` too. Structural rather than `instanceof`, since a
		// node from another realm fails that.
		const style = isSwipeSurface(el) ? el.style : null;
		// Vertical panning stays, horizontal does not: the browser then owns a
		// vertical scroll gesture and hands horizontal intent to the handler.
		style?.setProperty('touch-action', 'pan-y');
		if (options.disableTextSelect) {
			style?.setProperty('-webkit-user-select', 'none');
			style?.setProperty('-ms-user-select', 'none');
			style?.setProperty('user-select', 'none');
		}
		// Passive, matching VueUse: nothing here calls `preventDefault`, and
		// `touch-action` is what actually suppresses the browser's own panning.
		detach = [
			bindListener(el, 'pointerdown', onPointerDown, { passive: true }),
			bindListener(el, 'pointermove', onPointerMove, { passive: true }),
			bindListener(el, 'pointerup', onPointerUp, { passive: true }),
			bindListener(el, 'pointercancel', onPointerUp, { passive: true })
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
		get posStart() {
			return posStart;
		},
		get posEnd() {
			return posEnd;
		},
		get distanceX() {
			return diffX;
		},
		get distanceY() {
			return diffY;
		},
		stop
	};
}
