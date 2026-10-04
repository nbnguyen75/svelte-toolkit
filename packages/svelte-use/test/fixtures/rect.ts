/**
 * Layout stubs for jsdom, which has no layout engine.
 *
 * `getBoundingClientRect` reads as all zeros and the scroll metrics read as 0
 * and ignore writes, so any util that measures or scrolls has to be told what
 * the box is. Both helpers install configurable own properties, so the next
 * test gets a clean element.
 */
import { vi } from 'vitest';

/** A `DOMRect` with every field filled in, so tests only state what matters. */
export interface RectInit {
	top?: number;
	left?: number;
	width?: number;
	height?: number;
}

/** The scroll metrics `useDraggable` clamps against. */
export interface ScrollMetrics {
	clientWidth?: number;
	clientHeight?: number;
	scrollWidth?: number;
	scrollHeight?: number;
	scrollLeft?: number;
	scrollTop?: number;
}

/** jsdom has no layout, so the rect has to be supplied. Returns the spy. */
export function stubRect(el: Element, rect: RectInit = {}): ReturnType<typeof vi.spyOn> {
	const { top = 0, left = 0, width = 0, height = 0 } = rect;
	return vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
		top,
		left,
		width,
		height,
		right: left + width,
		bottom: top + height,
		x: left,
		y: top,
		toJSON: () => ({}),
		...rect
	} as DOMRect);
}

/**
 * Supplies `clientWidth` / `scrollWidth` / `scrollLeft` and their vertical
 * twins. `scrollLeft` / `scrollTop` stay writable, so a test can scroll the
 * container and see a drag follow it.
 */
export function stubScroll(el: Element, metrics: ScrollMetrics = {}): void {
	const {
		clientWidth = 0,
		clientHeight = 0,
		scrollWidth = 0,
		scrollHeight = 0,
		scrollLeft = 0,
		scrollTop = 0
	} = metrics;
	for (const [name, value] of Object.entries({
		clientWidth,
		clientHeight,
		scrollWidth,
		scrollHeight,
		scrollLeft,
		scrollTop
	})) {
		Object.defineProperty(el, name, { configurable: true, value, writable: true });
	}
}
