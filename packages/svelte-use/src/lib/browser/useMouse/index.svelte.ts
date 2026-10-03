import type { MaybeGetter } from '../../shared/getter.ts';

import { resolveGetter } from '../../shared/getter.ts';
import { isBrowser } from '../../shared/is.ts';
import { useEventListener } from '../useEventListener/index.svelte.ts';

/** Coordinate space the reported position is expressed in. */
export type UseMouseCoordType = 'client' | 'movement' | 'page' | 'screen';

/** Which input device last reported a position. */
export type UseMouseSourceType = 'mouse' | 'touch' | null;

/** A pointer position read off an event. Returns `null` to ignore the event. */
export type UseMouseEventExtractor = (event: MouseEvent | Touch) => [number, number] | null;

/** A starting position. */
export interface UseMousePosition {
	x: number;
	y: number;
}

/** Event target to listen on. */
export type UseMouseTarget = EventTarget | null | undefined;

/** Options for {@link useMouse}. */
export interface UseMouseOptions {
	/**
	 * Coordinate space, or a custom extractor returning `[x, y]` (or `null` to
	 * ignore an event).
	 * @default 'page'
	 */
	type?: UseMouseCoordType | UseMouseEventExtractor;
	/**
	 * Element to listen on.
	 * @default () => (isBrowser ? window : undefined)
	 */
	target?: MaybeGetter<UseMouseTarget>;
	/**
	 * Starting position, also the value `resetOnTouchEnds` restores.
	 * @default { x: 0, y: 0 }
	 */
	initialValue?: UseMousePosition;
	/**
	 * Reset to `initialValue` on `touchend`.
	 * @default false
	 */
	resetOnTouchEnds?: boolean;
	/**
	 * Re-anchor the position on window scroll, so a `page`-type position stays
	 * document-relative. Ignored for any other `type`.
	 * @default true
	 */
	scroll?: boolean;
	/**
	 * Also track `touchstart` / `touchmove`. Ignored for `type: 'movement'`,
	 * which has no touch equivalent.
	 * @default true
	 */
	touch?: boolean;
}

/** Reactive pointer position returned by {@link useMouse}. */
export interface UseMouseReturn {
	/** Which device last reported, or `null` before the first event. */
	readonly sourceType: UseMouseSourceType;
	/** Horizontal position in the configured coordinate space. */
	readonly x: number;
	/** Vertical position in the configured coordinate space. */
	readonly y: number;
}

/**
 * Built-in extractors. `MouseEvent` and `Touch` both expose all six coordinate
 * properties, so the union needs no narrowing to read them.
 *
 * `movement` is relative to the previous event rather than to the viewport, and
 * a `Touch` has no movement — so it declines those events by returning `null`.
 */
const EXTRACTORS: Record<UseMouseCoordType, UseMouseEventExtractor> = {
	client: (event) => [event.clientX, event.clientY],
	movement: (event) => {
		// A `Touch` carries no movementX/Y, so a touch can never move this.
		if (!('movementX' in event)) return null;
		const { movementX, movementY } = event;
		return [movementX, movementY];
	},
	page: (event) => [event.pageX, event.pageY],
	screen: (event) => [event.screenX, event.screenY]
};

/**
 * `useEventListener`'s generic overload hands back a plain `Event`, but the DOM
 * guarantees the concrete type for a given event name: `mousemove` is always a
 * `MouseEvent`, `touchstart` always a `TouchEvent`.
 *
 * Recovering that needs either an assertion or a predicate, and both are suspect
 * on their own: `in` narrowing adds the key to the type without its numeric
 * fields, and `instanceof` is banned for being cross-realm unsafe. A predicate
 * keeps the narrowing honest at the one place the event name guarantees it.
 */
function isMouseEvent(event: Event): event is MouseEvent {
	return 'clientX' in event;
}

function isTouchEvent(event: Event): event is TouchEvent {
	return 'touches' in event;
}

/**
 * Reactive pointer position, following the mouse or the first touch. Must be
 * called in component initialization (uses `$state` / `$effect`).
 *
 * `mousemove` and `dragover` are both listened to, so the position keeps
 * updating while an HTML5 drag is in flight.
 *
 * @param options `type`, `target`, `touch`, `scroll`, `resetOnTouchEnds`, `initialValue`.
 * @returns Getter-backed `x`, `y`, and `sourceType`.
 * @example
 * ```ts
 * const { x, y, sourceType } = useMouse();
 *
 * console.log(x, y, sourceType); // page coords, 'mouse' | 'touch' | null
 * ```
 */
export function useMouse(options: UseMouseOptions = {}): UseMouseReturn {
	const {
		type = 'page',
		touch = true,
		scroll = true,
		resetOnTouchEnds = false,
		initialValue = { x: 0, y: 0 }
	} = options;

	// Held in plain variables, not `$state`: nothing reads them reactively, they
	// only feed the scroll handler's delta.
	let lastPosition: [number, number] | null = null;
	let prevScrollX = 0;
	let prevScrollY = 0;

	let x = $state(initialValue.x);
	let y = $state(initialValue.y);
	let sourceType = $state<UseMouseSourceType>(null);

	const extract = typeof type === 'function' ? type : EXTRACTORS[type];

	function mouseHandler(event: Event): void {
		if (!isMouseEvent(event)) return;
		const position = extract(event);
		if (position) {
			[x, y] = position;
			lastPosition = position;
			sourceType = 'mouse';
		}
		// Captured after the move, so the next scroll only counts the distance
		// travelled *since* this event.
		if (isBrowser) {
			prevScrollX = window.scrollX;
			prevScrollY = window.scrollY;
		}
	}

	function touchHandler(event: Event): void {
		if (!isTouchEvent(event)) return;
		const first = event.touches[0];
		if (!first) return;
		const position = extract(first);
		if (position) {
			[x, y] = position;
			sourceType = 'touch';
		}
	}

	function scrollHandler(): void {
		if (!lastPosition || !isBrowser) return;
		// A page-space position is document-relative, so scrolling the viewport
		// has to move it by the same delta to stay over the same physical spot.
		x = lastPosition[0] + window.scrollX - prevScrollX;
		y = lastPosition[1] + window.scrollY - prevScrollY;
	}

	function reset(): void {
		x = initialValue.x;
		y = initialValue.y;
	}

	const passive = { passive: true };
	// A getter, not a captured value: the default resolves `window` lazily so
	// SSR setup never reads it, and an element swapped via `bind:this` is picked
	// up without re-mounting.
	const target = (): UseMouseTarget =>
		options.target === undefined ? (isBrowser ? window : undefined) : resolveGetter(options.target);

	useEventListener(target, 'mousemove', mouseHandler, passive);
	useEventListener(target, 'dragover', mouseHandler, passive);

	if (touch && type !== 'movement') {
		useEventListener(target, 'touchstart', touchHandler, passive);
		useEventListener(target, 'touchmove', touchHandler, passive);
		if (resetOnTouchEnds) useEventListener(target, 'touchend', reset, passive);
	}

	if (scroll && type === 'page') {
		useEventListener(() => (isBrowser ? window : undefined), 'scroll', scrollHandler, passive);
	}

	return {
		get sourceType() {
			return sourceType;
		},
		get x() {
			return x;
		},
		get y() {
			return y;
		}
	};
}
