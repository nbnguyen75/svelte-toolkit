// @vitest-environment jsdom
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountInitialized } from '../../../../test/fixtures/mount.ts';
import { MockResizeObserver } from '../../../../test/fixtures/observers.ts';
import { useElementBounding } from './index.ts';

const noop = () => {};

beforeEach(() => {
	MockResizeObserver.install();
});

const created: Element[] = [];

function box(): HTMLDivElement {
	const el = document.createElement('div');
	document.body.append(el);
	created.push(el);
	return el;
}

/** jsdom has no layout, so the rect has to be supplied. Returns the spy. */
function stubRect(el: HTMLElement, rect: Partial<DOMRect>): ReturnType<typeof vi.spyOn> {
	return vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
		height: 0,
		bottom: 0,
		left: 0,
		right: 0,
		top: 0,
		width: 0,
		x: 0,
		y: 0,
		...rect
	} as DOMRect);
}

afterEach(() => {
	for (const el of created.splice(0)) el.remove();
});

describe('useElementBounding', () => {
	it('reports zeroes before the first measurement', async () => {
		const el = box();
		stubRect(el, { width: 100 });
		const { api, dispose } = await mountInitialized(() => useElementBounding(el), noop);
		try {
			// Nothing has measured yet; the effect that zeroes a missing element has
			// run, not the observer that fills the box.
			expect(api.width).toBe(0);
			expect(api.height).toBe(0);
		} finally {
			await dispose();
		}
	});

	it('measures on update', async () => {
		const el = box();
		stubRect(el, { width: 300, height: 40, top: 10, left: 5, right: 305, bottom: 50, x: 5, y: 10 });
		const { api, dispose } = await mountInitialized(() => useElementBounding(el), noop);
		try {
			api.update();

			expect(api.width).toBe(300);
			expect(api.height).toBe(40);
			expect(api.top).toBe(10);
			expect(api.left).toBe(5);
			expect(api.right).toBe(305);
			expect(api.bottom).toBe(50);
			expect(api.x).toBe(5);
			expect(api.y).toBe(10);
		} finally {
			await dispose();
		}
	});

	it('re-measures when the element resizes', async () => {
		const el = box();
		const rect = stubRect(el, { width: 100 });
		const { api, dispose } = await mountInitialized(() => useElementBounding(el), noop);
		try {
			api.update();
			expect(api.width).toBe(100);

			rect.mockReturnValue({ width: 250 } as DOMRect);
			MockResizeObserver.triggerFor(el, { contentRect: { width: 250 } });

			expect(api.width).toBe(250);
		} finally {
			await dispose();
		}
	});

	it('re-measures when a style or class attribute changes', async () => {
		const el = box();
		const { api, dispose } = await mountInitialized(() => useElementBounding(el), noop);
		try {
			// The mutation observer's real callback runs as a microtask, so drive
			// the measure through it the way the platform would.
			api.update();
			const before = api.width;

			el.setAttribute('style', 'width: 9px');
			el.getBoundingClientRect = () => ({ width: before + 1 }) as DOMRect;
			await tick();
			await Promise.resolve();

			expect(api.width).not.toBe(before);
		} finally {
			await dispose();
		}
	});

	it('zeroes the box when the element goes away', async () => {
		const el = box();
		stubRect(el, { width: 300, height: 40 });
		const source = createBox<HTMLDivElement | undefined>(el);
		const { api, dispose } = await mountInitialized(
			() => useElementBounding(() => source.value),
			noop
		);
		try {
			api.update();
			expect(api.width).toBe(300);

			source.value = undefined;
			await tick();

			expect(api.width).toBe(0);
			expect(api.height).toBe(0);
		} finally {
			await dispose();
		}
	});

	it('keeps the last box when reset is off', async () => {
		const el = box();
		stubRect(el, { width: 300 });
		const source = createBox<HTMLDivElement | undefined>(el);
		const { api, dispose } = await mountInitialized(
			() => useElementBounding(() => source.value, { reset: false }),
			noop
		);
		try {
			api.update();
			expect(api.width).toBe(300);

			source.value = undefined;
			await tick();

			expect(api.width).toBe(300);
		} finally {
			await dispose();
		}
	});

	it('re-measures on window resize', async () => {
		const el = box();
		stubRect(el, { width: 100 });
		const { api, dispose } = await mountInitialized(() => useElementBounding(el), noop);
		try {
			const rect = vi.spyOn(el, 'getBoundingClientRect');
			rect.mockReturnValue({ width: 640 } as DOMRect);
			window.dispatchEvent(new Event('resize'));

			expect(api.width).toBe(640);
		} finally {
			await dispose();
		}
	});

	it('ignores window resize when windowResize is off', async () => {
		const el = box();
		const { api, dispose } = await mountInitialized(
			() => useElementBounding(el, { windowResize: false }),
			noop
		);
		try {
			const rect = vi.spyOn(el, 'getBoundingClientRect');
			window.dispatchEvent(new Event('resize'));

			expect(rect).not.toHaveBeenCalled();
			expect(api.width).toBe(0);
		} finally {
			await dispose();
		}
	});

	it('re-measures on scroll', async () => {
		const el = box();
		stubRect(el, { width: 100 });
		const { api, dispose } = await mountInitialized(() => useElementBounding(el), noop);
		try {
			const rect = vi.spyOn(el, 'getBoundingClientRect');
			rect.mockReturnValue({ top: 42 } as DOMRect);
			window.dispatchEvent(new Event('scroll'));

			expect(api.top).toBe(42);
		} finally {
			await dispose();
		}
	});

	it('ignores scroll when windowScroll is off', async () => {
		const el = box();
		const { api, dispose } = await mountInitialized(
			() => useElementBounding(el, { windowScroll: false }),
			noop
		);
		try {
			const rect = vi.spyOn(el, 'getBoundingClientRect');
			window.dispatchEvent(new Event('scroll'));

			expect(rect).not.toHaveBeenCalled();
		} finally {
			await dispose();
		}
	});

	it('defers the measurement a frame with next-frame timing', async () => {
		const el = box();
		stubRect(el, { width: 100 });
		const frames = vi.spyOn(window, 'requestAnimationFrame');
		const { api, dispose } = await mountInitialized(
			() => useElementBounding(el, { updateTiming: 'next-frame' }),
			noop
		);
		try {
			api.update();

			expect(frames).toHaveBeenCalledOnce();
			expect(api.width).toBe(0);

			frames.mockRestore();
			await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

			expect(api.width).toBe(100);
		} finally {
			await dispose();
		}
	});

	it('keeps a nullish target at zeroes without throwing', async () => {
		const { api, dispose } = await mountInitialized(() => useElementBounding(null), noop);
		try {
			api.update();
			expect(api.width).toBe(0);
		} finally {
			await dispose();
		}
	});
});
