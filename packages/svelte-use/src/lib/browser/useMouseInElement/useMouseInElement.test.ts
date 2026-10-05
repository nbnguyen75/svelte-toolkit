// @vitest-environment jsdom
/**
 * jsdom has no layout engine, so `getClientRects()` returns nothing until stubbed
 * and there is no box to be inside of. Each test pins the rects it needs.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { mountUtil } from '../../../../test/fixtures/mount.ts';
import { MockResizeObserver } from '../../../../test/fixtures/observers.ts';
import { useMouseInElement } from './index.ts';
import type { UseMouseInElementOptions } from './index.ts';

interface Rect {
	left: number;
	top: number;
	width: number;
	height: number;
}

const created: Element[] = [];

/** Give `el` a box, replacing the empty list jsdom returns. */
function stubRects(el: Element, rects: Rect[]): void {
	Object.defineProperty(el, 'getClientRects', {
		configurable: true,
		value: () =>
			rects.map((rect) => ({
				...rect,
				x: rect.left,
				y: rect.top,
				right: rect.left + rect.width,
				bottom: rect.top + rect.height,
				toJSON: () => rect
			}))
	});
}

function box(rects: Rect[]): HTMLDivElement {
	const el = document.createElement('div');
	stubRects(el, rects);
	document.body.append(el);
	created.push(el);
	return el;
}

/** jsdom reports `pageX === clientX`, so the field under test is defined here. */
function mouse(type: string, x: number, y: number): MouseEvent {
	const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y });
	Object.defineProperties(event, { pageX: { value: x }, pageY: { value: y } });
	return event;
}

function move(x: number, y: number): void {
	window.dispatchEvent(mouse('mousemove', x, y));
}

/** A 100x50 box at (10, 20) in viewport space. */
const RECT: Rect = { left: 10, top: 20, width: 100, height: 50 };

const homeX = window.pageXOffset;
const homeY = window.pageYOffset;

function stubPageOffset(x: number, y: number): void {
	Object.defineProperty(window, 'pageXOffset', { configurable: true, value: x });
	Object.defineProperty(window, 'pageYOffset', { configurable: true, value: y });
}

beforeEach(() => {
	MockResizeObserver.install();
	stubPageOffset(0, 0);
});

afterEach(() => {
	for (const el of created.splice(0)) el.remove();
	stubPageOffset(homeX, homeY);
});

describe('useMouseInElement', () => {
	it('defaults to document.body', async () => {
		stubRects(document.body, [{ left: 0, top: 0, width: 800, height: 600 }]);
		const { api, dispose } = await mountUtil(() => useMouseInElement());
		try {
			move(30, 40);
			await Promise.resolve();
			expect(api.isOutside).toBe(false);
			expect(api.elementX).toBe(30);
			expect(api.elementY).toBe(40);
		} finally {
			await dispose();
		}
	});

	it('reports the element box and the cursor position inside it', async () => {
		const el = box([RECT]);
		const { api, dispose } = await mountUtil(() => useMouseInElement(el));
		try {
			move(60, 45);
			await Promise.resolve();

			expect(api.isOutside).toBe(false);
			expect(api.elementX).toBe(50);
			expect(api.elementY).toBe(25);
			expect(api.elementPositionX).toBe(10);
			expect(api.elementPositionY).toBe(20);
			expect(api.elementWidth).toBe(100);
			expect(api.elementHeight).toBe(50);
		} finally {
			await dispose();
		}
	});

	it('follows the cursor outside the element', async () => {
		const el = box([RECT]);
		const { api, dispose } = await mountUtil(() => useMouseInElement(el));
		try {
			move(60, 45);
			await Promise.resolve();
			move(300, 45);
			await Promise.resolve();

			expect(api.isOutside).toBe(true);
			expect(api.elementX).toBe(290);
			expect(api.elementY).toBe(25);
		} finally {
			await dispose();
		}
	});

	it('keeps the last in-bounds position when handleOutside is false', async () => {
		const el = box([RECT]);
		const { api, dispose } = await mountUtil(() => useMouseInElement(el, { handleOutside: false }));
		try {
			move(60, 45);
			await Promise.resolve();
			move(300, 300);
			await Promise.resolve();

			expect(api.isOutside).toBe(true);
			expect(api.elementX).toBe(50);
			expect(api.elementY).toBe(25);
		} finally {
			await dispose();
		}
	});

	it('adds the page offset for page coordinates only', async () => {
		stubPageOffset(100, 200);
		const el = box([RECT]);
		const page = await mountUtil(() => useMouseInElement(el));
		try {
			move(150, 245);
			await Promise.resolve();
			expect(page.api.elementPositionX).toBe(110);
			expect(page.api.elementPositionY).toBe(220);
			// A page-space cursor minus a page-space position: still relative.
			expect(page.api.elementX).toBe(40);
		} finally {
			await page.dispose();
		}

		const client = await mountUtil(() => useMouseInElement(el, { type: 'client' }));
		try {
			move(150, 245);
			await Promise.resolve();
			expect(client.api.elementPositionX).toBe(10);
			expect(client.api.elementPositionY).toBe(20);
		} finally {
			await client.dispose();
		}
	});

	it('treats a zero-area box as outside', async () => {
		const el = box([{ left: 10, top: 20, width: 0, height: 0 }]);
		const { api, dispose } = await mountUtil(() => useMouseInElement(el));
		try {
			move(10, 20);
			await Promise.resolve();
			expect(api.isOutside).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('accepts the cursor inside any box of a wrapped element', async () => {
		const el = box([RECT, { left: 10, top: 120, width: 100, height: 50 }]);
		const { api, dispose } = await mountUtil(() => useMouseInElement(el));
		try {
			move(60, 130);
			await Promise.resolve();

			expect(api.isOutside).toBe(false);
			expect(api.elementY).toBe(10);
			expect(api.elementPositionY).toBe(120);
		} finally {
			await dispose();
		}
	});

	it('re-measures when the resize observer reports', async () => {
		const el = box([RECT]);
		const { api, dispose } = await mountUtil(() => useMouseInElement(el));
		try {
			move(60, 45);
			await Promise.resolve();

			stubRects(el, [{ left: 40, top: 20, width: 100, height: 50 }]);
			MockResizeObserver.triggerFor(el, {});
			await Promise.resolve();

			// The cursor did not move, but the box did.
			expect(api.elementPositionX).toBe(40);
			expect(api.elementX).toBe(20);
		} finally {
			await dispose();
		}
	});

	it('re-measures on window scroll unless opted out', async () => {
		const el = box([RECT]);
		const { api, dispose } = await mountUtil(() => useMouseInElement(el));
		try {
			stubRects(el, [{ left: 40, top: 20, width: 100, height: 50 }]);
			window.dispatchEvent(new Event('scroll'));
			await Promise.resolve();
			expect(api.elementPositionX).toBe(40);
		} finally {
			await dispose();
		}

		const off = box([RECT]);
		const { api: quiet, dispose: disposeQuiet } = await mountUtil(() =>
			useMouseInElement(off, { windowScroll: false })
		);
		try {
			stubRects(off, [{ left: 40, top: 20, width: 100, height: 50 }]);
			window.dispatchEvent(new Event('scroll'));
			await Promise.resolve();
			expect(quiet.elementPositionX).toBe(10);
		} finally {
			await disposeQuiet();
		}
	});

	it('re-measures on window resize unless opted out', async () => {
		const el = box([RECT]);
		const { api, dispose } = await mountUtil(() => useMouseInElement(el));
		try {
			stubRects(el, [{ left: 10, top: 60, width: 100, height: 50 }]);
			window.dispatchEvent(new Event('resize'));
			await Promise.resolve();
			expect(api.elementPositionY).toBe(60);
		} finally {
			await dispose();
		}

		const off = box([RECT]);
		const { api: quiet, dispose: disposeQuiet } = await mountUtil(() =>
			useMouseInElement(off, { windowResize: false })
		);
		try {
			stubRects(off, [{ left: 10, top: 60, width: 100, height: 50 }]);
			window.dispatchEvent(new Event('resize'));
			await Promise.resolve();
			expect(quiet.elementPositionY).toBe(20);
		} finally {
			await disposeQuiet();
		}
	});

	it('marks the cursor outside when the document reports mouseleave', async () => {
		const el = box([RECT]);
		const { api, dispose } = await mountUtil(() => useMouseInElement(el));
		try {
			move(60, 45);
			await Promise.resolve();
			expect(api.isOutside).toBe(false);

			document.dispatchEvent(new MouseEvent('mouseleave'));
			await Promise.resolve();
			expect(api.isOutside).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('stops tracking on stop() and releases the observers', async () => {
		const el = box([RECT]);
		const { api, dispose } = await mountUtil(() => useMouseInElement(el));
		try {
			move(60, 45);
			await Promise.resolve();
			expect(MockResizeObserver.observedCount()).toBe(1);

			api.stop();
			expect(MockResizeObserver.observedCount()).toBe(0);

			stubRects(el, [{ left: 200, top: 200, width: 10, height: 10 }]);
			MockResizeObserver.triggerFor(el, {});
			window.dispatchEvent(new Event('scroll'));
			window.dispatchEvent(new Event('resize'));
			move(250, 250);
			await Promise.resolve();

			expect(api.elementPositionX).toBe(10);
			expect(api.elementX).toBe(50);
		} finally {
			await dispose();
		}
	});

	it('releases the listeners on unmount', async () => {
		const el = box([RECT]);
		const { api, dispose } = await mountUtil(() => useMouseInElement(el));
		await dispose();

		// Measured once on mount, so the last value stands; nothing after teardown
		// may move it.
		expect(api.elementPositionX).toBe(10);

		stubRects(el, [{ left: 200, top: 200, width: 10, height: 10 }]);
		window.dispatchEvent(new Event('resize'));
		move(250, 250);
		await Promise.resolve();

		expect(api.elementPositionX).toBe(10);
		expect(MockResizeObserver.observedCount()).toBe(0);
	});
});
