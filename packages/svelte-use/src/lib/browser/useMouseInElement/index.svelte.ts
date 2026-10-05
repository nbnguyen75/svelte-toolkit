import type { MaybeElement } from '../../shared/element.ts';
import type { MaybeGetter } from '../../shared/getter.ts';
import type { UseMouseOptions, UseMouseReturn } from '../useMouse/index.ts';

import { useMutationObserver } from '../../elements/useMutationObserver/index.ts';
import { useResizeObserver } from '../../elements/useResizeObserver/index.ts';
import { resolveGetter } from '../../shared/getter.ts';
import { isBrowser } from '../../shared/is.ts';
import { bindListener } from '../useEventListener/bind.ts';
import { useMouse } from '../useMouse/index.ts';

/** Options for {@link useMouseInElement}. */
export interface UseMouseInElementOptions extends UseMouseOptions {
	/**
	 * Whether to keep following the cursor while it is outside the target
	 * element. When disabled, `elementX` / `elementY` keep their last in-bounds
	 * value instead of tracking the cursor out of the element.
	 *
	 * @default true
	 */
	handleOutside?: boolean;
	/**
	 * Listen to window scroll events, so the position stays correct when the page
	 * moves under a stationary cursor.
	 *
	 * @default true
	 */
	windowScroll?: boolean;
	/**
	 * Listen to window resize events, so the element box stays correct after a
	 * viewport change.
	 *
	 * @default true
	 */
	windowResize?: boolean;
}

/** Reactive mouse position relative to an element. */
export interface UseMouseInElementReturn extends UseMouseReturn {
	/** The element's X position in the chosen coordinate space. */
	readonly elementPositionX: number;
	/** The element's Y position in the chosen coordinate space. */
	readonly elementPositionY: number;
	/** The element's height. */
	readonly elementHeight: number;
	/** The element's width. */
	readonly elementWidth: number;
	/** Whether the cursor is outside the element, or the element has no box. */
	readonly isOutside: boolean;
	/** Cursor X relative to the element's top-left corner. */
	readonly elementX: number;
	/** Cursor Y relative to the element's top-left corner. */
	readonly elementY: number;
	/** Stop the element-relative tracking. `useMouse` keeps following the cursor. */
	stop: () => void;
}

/**
 * Reactive mouse position relative to an element.
 *
 * The element's box is re-read only when it can have changed - on resize, and on
 * `style` / `class` mutations - instead of on every pointer move, so this stays
 * cheap on a busy page.
 *
 * Must be called in component initialization.
 *
 * @param target Element to measure against, or a getter re-resolved on every effect run. Defaults to `document.body`.
 * @param options Every `useMouse` option, plus `handleOutside`, `windowScroll`, and `windowResize`.
 * @returns `x`, `y`, `sourceType`, the element-relative values, and `stop`.
 * @example
 * ```svelte
 * <script lang="ts">
 * 	import { useMouseInElement } from '@wynn-dev/svelte-use';
 *
 * 	let card: HTMLDivElement;
 * 	const { elementX, elementY, isOutside } = useMouseInElement(() => card);
 * </script>
 *
 * <div bind:this={card}>{#if isOutside}away{:else}{elementX}, {elementY}{/if}</div>
 * ```
 */
export function useMouseInElement(
	target: MaybeGetter<MaybeElement> = () => (isBrowser ? document.body : null),
	options: UseMouseInElementOptions = {}
): UseMouseInElementReturn {
	const {
		handleOutside = true,
		windowResize = true,
		windowScroll = true,
		...mouseOptions
	} = options;

	// Upstream reads `options.type || 'page'`; a custom extractor is a function,
	// so it is truthy and lands on the same non-page branch there.
	const usesPageCoords = (mouseOptions.type ?? 'page') === 'page';

	// Kept as the object rather than destructured: `x` and `y` are getters, and
	// destructuring would freeze them at their initial values.
	const mouse = useMouse(mouseOptions);

	let elementX = $state(0);
	let elementY = $state(0);
	let elementPositionX = $state(0);
	let elementPositionY = $state(0);
	let elementHeight = $state(0);
	let elementWidth = $state(0);
	let isOutside = $state(true);

	// Plain variables, like the observer utils use: making them `$state` would
	// re-arm the effects below on every write.
	let stopped = false;
	let detach: Array<() => void> = [];

	function update(): void {
		if (stopped || !isBrowser) return;
		const el = resolveGetter(target);
		// Typed as an element already, so there is no runtime `instanceof` to do.
		if (!el) return;

		const rects = el.getClientRects();
		// Upstream leaves every value untouched when there is no box to report.
		if (rects.length === 0) return;

		// Read once: the page offset cannot move within the loop.
		const pageX = usesPageCoords ? window.pageXOffset : 0;
		const pageY = usesPageCoords ? window.pageYOffset : 0;

		// Plain locals, then one write per field at the end. Reading a `$state`
		// back after writing it - which is what assigning then subtracting these
		// values would do - makes the tracking effect below invalidate itself, and
		// a second rect is enough to keep it invalidated forever.
		let nextX = 0;
		let nextY = 0;
		let nextPositionX = 0;
		let nextPositionY = 0;
		let nextHeight = 0;
		let nextWidth = 0;
		let nextOutside = true;
		let positionChanged = false;

		for (const rect of rects) {
			const { left, top, width, height } = rect;

			nextPositionX = left + pageX;
			nextPositionY = top + pageY;
			nextHeight = height;
			nextWidth = width;

			const elX = mouse.x - nextPositionX;
			const elY = mouse.y - nextPositionY;
			nextOutside =
				width === 0 || height === 0 || elX < 0 || elY < 0 || elX > width || elY > height;

			if (handleOutside || !nextOutside) {
				nextX = elX;
				nextY = elY;
				positionChanged = true;
			}

			// An element wrapped across lines reports several boxes; it counts as
			// inside only when the cursor is within one of them.
			if (!nextOutside) break;
		}

		elementPositionX = nextPositionX;
		elementPositionY = nextPositionY;
		elementHeight = nextHeight;
		elementWidth = nextWidth;
		isOutside = nextOutside;
		if (positionChanged) {
			elementX = nextX;
			elementY = nextY;
		}
	}

	// The box can change without the cursor moving, so it is observed rather than
	// measured per pointer event.
	const resize = useResizeObserver(target, update);
	const mutation = useMutationObserver(target, update, { attributeFilter: ['style', 'class'] });

	// The upstream `watch([targetRef, x, y], update)` plus its on-mount call: the
	// reads inside `update` are what subscribe this effect, and its first run is
	// the initial measure. Nothing it writes is read here, so tracking is safe.
	$effect(update);

	$effect(() => {
		detach = [
			bindListener(
				isBrowser ? document : null,
				'mouseleave',
				() => {
					isOutside = true;
				},
				{ passive: true }
			),
			bindListener(windowScroll && isBrowser ? window : null, 'scroll', update, {
				capture: true,
				passive: true
			}),
			bindListener(windowResize && isBrowser ? window : null, 'resize', update, { passive: true })
		];
		return () => {
			for (const off of detach) off();
			detach = [];
		};
	});

	function stop(): void {
		stopped = true;
		resize.stop();
		mutation.stop();
		for (const off of detach) off();
		detach = [];
	}

	return {
		get x() {
			return mouse.x;
		},
		get y() {
			return mouse.y;
		},
		get sourceType() {
			return mouse.sourceType;
		},
		get elementX() {
			return elementX;
		},
		get elementY() {
			return elementY;
		},
		get elementPositionX() {
			return elementPositionX;
		},
		get elementPositionY() {
			return elementPositionY;
		},
		get elementHeight() {
			return elementHeight;
		},
		get elementWidth() {
			return elementWidth;
		},
		get isOutside() {
			return isOutside;
		},
		stop
	};
}
