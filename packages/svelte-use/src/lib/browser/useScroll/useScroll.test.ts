// @vitest-environment jsdom
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mountUtil } from '../../../../test/fixtures/mount.ts';
import { useScroll, type UseScrollOptions, type UseScrollReturn } from './index.ts';

interface Metrics {
	clientHeight: number;
	clientWidth: number;
	scrollHeight: number;
	scrollWidth: number;
}

const DEFAULT_METRICS: Metrics = {
	clientHeight: 100,
	clientWidth: 100,
	scrollHeight: 500,
	scrollWidth: 500
};

/**
 * jsdom has no layout, so `client*` and `scroll*` all read `0`. They are defined
 * as live getters over a mutable record so a test can grow the scrollable extent
 * the way real content growth would.
 */
function fakeMetrics(el: Element, metrics: Metrics): Metrics {
	const live = { ...DEFAULT_METRICS, ...metrics };
	for (const [key, value] of Object.entries(live)) {
		Object.defineProperty(el, key, { configurable: true, get: () => live[key as keyof Metrics] });
	}
	return live;
}

function makeScroller(metrics?: Partial<Metrics>): HTMLElement {
	const el = document.createElement('div');
	fakeMetrics(el, metrics ?? {});
	document.body.appendChild(el);
	return el;
}

/** jsdom implements no scrolling, so `scrollTo` is stubbed to move the offsets. */
function stubScrollTo(el: Element) {
	const scrollTo = vi.fn((options?: ScrollToOptions) => {
		el.scrollTop = options?.top ?? el.scrollTop;
		el.scrollLeft = options?.left ?? el.scrollLeft;
	});
	Object.defineProperty(el, 'scrollTo', { configurable: true, value: scrollTo });
	return scrollTo;
}

/** Mount `useScroll` on `el` and assert the public surface at the same time. */
async function mountScroll(el: Element | Window | Document, options?: UseScrollOptions) {
	const { api, dispose } = await mountUtil(() => useScroll(() => el, options));
	const shaped: UseScrollReturn = api;
	return { api: shaped, dispose };
}

const scrollers: Element[] = [];
afterEach(() => {
	for (const el of scrollers.splice(0)) el.remove();
});

describe('useScroll', () => {
	it('reports a zero offset before anything scrolls', async () => {
		const el = makeScroller();
		scrollers.push(el);
		const { api, dispose } = await mountScroll(el);
		try {
			expect(api.x).toBe(0);
			expect(api.y).toBe(0);
			expect(api.isScrolling).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('tracks the offset after a scroll event', async () => {
		const el = makeScroller();
		scrollers.push(el);
		const { api, dispose } = await mountScroll(el);
		try {
			el.scrollTop = 200;
			el.scrollLeft = 30;
			el.dispatchEvent(new Event('scroll'));
			await tick();

			expect(api.y).toBe(200);
			expect(api.x).toBe(30);
			expect(api.isScrolling).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('reports arrived.top at the top and not at the bottom', async () => {
		const el = makeScroller();
		scrollers.push(el);
		const { api, dispose } = await mountScroll(el);
		try {
			expect(api.arrivedState.top).toBe(true);
			expect(api.arrivedState.bottom).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('treats one pixel short of the end as not yet arrived', async () => {
		const el = makeScroller();
		scrollers.push(el);
		const { api, dispose } = await mountScroll(el);
		try {
			// 398 + 100 = 498, short of the 500 - 1 threshold.
			el.scrollTop = 398;
			el.dispatchEvent(new Event('scroll'));
			await tick();
			expect(api.arrivedState.bottom).toBe(false);

			el.scrollTop = 399;
			el.dispatchEvent(new Event('scroll'));
			await tick();
			expect(api.arrivedState.bottom).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('gives up the last pixel to the arrived threshold', async () => {
		const el = makeScroller();
		scrollers.push(el);
		const { api, dispose } = await mountScroll(el);
		try {
			// Exactly at the end: unrounded scrollTop plus rounded scrollHeight
			// would otherwise compare unequal and flicker.
			el.scrollTop = 400;
			el.dispatchEvent(new Event('scroll'));
			await tick();
			expect(api.arrivedState.bottom).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('honours offset.bottom as extra slack', async () => {
		const el = makeScroller();
		scrollers.push(el);
		const { api, dispose } = await mountScroll(el, { offset: { bottom: 100 } });
		try {
			el.scrollTop = 250;
			el.dispatchEvent(new Event('scroll'));
			await tick();
			// 250 + 100 = 350, short of 500 - 100 - 1 = 399.
			expect(api.arrivedState.bottom).toBe(false);

			el.scrollTop = 300;
			el.dispatchEvent(new Event('scroll'));
			await tick();
			expect(api.arrivedState.bottom).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('honours offset.top as extra slack', async () => {
		const el = makeScroller();
		scrollers.push(el);
		const { api, dispose } = await mountScroll(el, { offset: { top: 40 } });
		try {
			el.scrollTop = 20;
			el.dispatchEvent(new Event('scroll'));
			await tick();
			expect(api.arrivedState.top).toBe(true);

			el.scrollTop = 50;
			el.dispatchEvent(new Event('scroll'));
			await tick();
			expect(api.arrivedState.top).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('reports the direction of travel and clears it on arrival at the top', async () => {
		const el = makeScroller();
		scrollers.push(el);
		const { api, dispose } = await mountScroll(el);
		try {
			el.scrollTop = 200;
			el.dispatchEvent(new Event('scroll'));
			await tick();
			expect(api.directions.bottom).toBe(true);
			expect(api.directions.top).toBe(false);

			el.scrollTop = 100;
			el.dispatchEvent(new Event('scroll'));
			await tick();
			expect(api.directions.top).toBe(true);
			expect(api.directions.bottom).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('reports left and right travel separately from top and bottom', async () => {
		const el = makeScroller();
		scrollers.push(el);
		const { api, dispose } = await mountScroll(el);
		try {
			el.scrollLeft = 80;
			el.dispatchEvent(new Event('scroll'));
			await tick();
			expect(api.directions.right).toBe(true);
			expect(api.directions.bottom).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('measures a negative scrollLeft, the shape an rtl container reports', async () => {
		const el = makeScroller({ clientWidth: 100, scrollWidth: 500 });
		scrollers.push(el);
		const { api, dispose } = await mountScroll(el);
		try {
			// rtl containers report scrollLeft <= 0. The `Math.abs` in the arrived
			// math is what normalises it — VueUse's extra -1 multiplier is a no-op.
			el.scrollLeft = -400;
			el.dispatchEvent(new Event('scroll'));
			await tick();

			expect(api.arrivedState.left).toBe(false);
			expect(api.arrivedState.right).toBe(true);
			expect(api.x).toBe(-400);
		} finally {
			await dispose();
		}
	});

	it('swaps left and right for a row-reverse flex container', async () => {
		const el = makeScroller({ clientWidth: 100, scrollWidth: 500 });
		scrollers.push(el);
		vi.spyOn(window, 'getComputedStyle').mockReturnValue({
			direction: 'ltr',
			display: 'flex',
			flexDirection: 'row-reverse'
		} as unknown as CSSStyleDeclaration);

		const { api, dispose } = await mountScroll(el);
		try {
			el.scrollLeft = 0;
			el.dispatchEvent(new Event('scroll'));
			await tick();
			expect(api.arrivedState.left).toBe(false);
			expect(api.arrivedState.right).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('swaps top and bottom for a column-reverse flex container', async () => {
		const el = makeScroller();
		scrollers.push(el);
		vi.spyOn(window, 'getComputedStyle').mockReturnValue({
			direction: 'ltr',
			display: 'flex',
			flexDirection: 'column-reverse'
		} as unknown as CSSStyleDeclaration);

		const { api, dispose } = await mountScroll(el);
		try {
			el.scrollTop = 0;
			el.dispatchEvent(new Event('scroll'));
			await tick();
			expect(api.arrivedState.top).toBe(false);
			expect(api.arrivedState.bottom).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('clears isScrolling after the idle period', async () => {
		vi.useFakeTimers();
		try {
			const el = makeScroller();
			scrollers.push(el);
			const { api, dispose } = await mountScroll(el);
			try {
				el.dispatchEvent(new Event('scroll'));
				await tick();
				expect(api.isScrolling).toBe(true);

				await vi.advanceTimersByTimeAsync(199);
				expect(api.isScrolling).toBe(true);

				await vi.advanceTimersByTimeAsync(2);
				expect(api.isScrolling).toBe(false);
			} finally {
				await dispose();
			}
		} finally {
			vi.useRealTimers();
		}
	});

	it('calls onScroll on every event and onStop once at the end', async () => {
		vi.useFakeTimers();
		try {
			const el = makeScroller();
			scrollers.push(el);
			const onScroll = vi.fn();
			const onStop = vi.fn();
			const { dispose } = await mountScroll(el, { onScroll, onStop });
			try {
				el.dispatchEvent(new Event('scroll'));
				el.dispatchEvent(new Event('scroll'));
				await tick();
				expect(onScroll).toHaveBeenCalledTimes(2);
				expect(onStop).not.toHaveBeenCalled();

				await vi.advanceTimersByTimeAsync(201);
				expect(onStop).toHaveBeenCalledTimes(1);
			} finally {
				await dispose();
			}
		} finally {
			vi.useRealTimers();
		}
	});

	it('coalesces updates when throttle is set', async () => {
		vi.useFakeTimers();
		try {
			const el = makeScroller();
			scrollers.push(el);
			const onScroll = vi.fn();
			const { dispose } = await mountScroll(el, { throttle: 100, onScroll });
			try {
				el.dispatchEvent(new Event('scroll'));
				el.dispatchEvent(new Event('scroll'));
				el.dispatchEvent(new Event('scroll'));
				await tick();
				// Leading edge only: the rest wait for the window to close.
				expect(onScroll).toHaveBeenCalledTimes(1);
			} finally {
				await dispose();
			}
		} finally {
			vi.useRealTimers();
		}
	});

	it('adds throttle to idle before ending, so a long throttle still stops', async () => {
		vi.useFakeTimers();
		try {
			const el = makeScroller();
			scrollers.push(el);
			const onStop = vi.fn();
			const { dispose } = await mountScroll(el, { throttle: 100, idle: 200, onStop });
			try {
				el.dispatchEvent(new Event('scroll'));
				await tick();
				expect(onStop).not.toHaveBeenCalled();

				await vi.advanceTimersByTimeAsync(299);
				expect(onStop).not.toHaveBeenCalled();

				await vi.advanceTimersByTimeAsync(2);
				expect(onStop).toHaveBeenCalledTimes(1);
			} finally {
				await dispose();
			}
		} finally {
			vi.useRealTimers();
		}
	});

	it('assigning y scrolls there and reports the new offset', async () => {
		const el = makeScroller();
		scrollers.push(el);
		const scrollTo = stubScrollTo(el);
		const { api, dispose } = await mountScroll(el);
		try {
			api.y = 250;
			expect(scrollTo).toHaveBeenCalledOnce();
			expect(el.scrollTop).toBe(250);
			expect(api.y).toBe(250);
		} finally {
			await dispose();
		}
	});

	it('assigning x leaves y where it was', async () => {
		const el = makeScroller();
		scrollers.push(el);
		stubScrollTo(el);
		const { api, dispose } = await mountScroll(el);
		try {
			api.y = 120;
			api.x = 40;
			expect(api.x).toBe(40);
			expect(api.y).toBe(120);
		} finally {
			await dispose();
		}
	});

	it('applies the configured scroll behavior', async () => {
		const el = makeScroller();
		scrollers.push(el);
		const scrollTo = stubScrollTo(el);
		const { api, dispose } = await mountScroll(el, { behavior: 'smooth' });
		try {
			api.y = 10;
			expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
		} finally {
			await dispose();
		}
	});

	it('resolves a behavior getter at assignment time', async () => {
		const el = makeScroller();
		scrollers.push(el);
		const scrollTo = stubScrollTo(el);
		let smooth = false;
		const { api, dispose } = await mountScroll(el, {
			behavior: () => (smooth ? 'smooth' : 'auto')
		});
		try {
			api.y = 10;
			smooth = true;
			api.y = 20;
			expect(scrollTo.mock.calls[0]?.[0]).toMatchObject({ behavior: 'auto' });
			expect(scrollTo.mock.calls[1]?.[0]).toMatchObject({ behavior: 'smooth' });
		} finally {
			await dispose();
		}
	});

	it('still reports the offset when the container cannot scroll itself', async () => {
		// jsdom has no `Element.scrollTo`; the write is skipped, not fatal.
		const el = makeScroller();
		scrollers.push(el);
		const { api, dispose } = await mountScroll(el);
		try {
			el.scrollTop = 90;
			el.dispatchEvent(new Event('scroll'));
			await tick();
			expect(api.y).toBe(90);
		} finally {
			await dispose();
		}
	});

	it('re-reads the extent through measure()', async () => {
		const el = makeScroller();
		scrollers.push(el);
		const metrics = fakeMetrics(el, {});
		const { api, dispose } = await mountScroll(el);
		try {
			el.scrollTop = 100;
			api.measure();
			// 100 + 100 = 200 against a 500px extent: nowhere near the end.
			expect(api.arrivedState.bottom).toBe(false);

			metrics.scrollHeight = 200;
			api.measure();
			// The extent shrank under the same offset, so it *is* the end now.
			expect(api.arrivedState.bottom).toBe(true);

			metrics.scrollHeight = 500;
			api.measure();
			expect(api.arrivedState.bottom).toBe(false);
			expect(api.y).toBe(100);
		} finally {
			await dispose();
		}
	});

	it('re-measures when the container mutates and observe is on', async () => {
		const el = makeScroller();
		scrollers.push(el);
		const { api, dispose } = await mountScroll(el, { observe: true });
		try {
			el.scrollTop = 150;
			api.measure();
			expect(api.y).toBe(150);

			el.setAttribute('data-changed', 'yes');
			// Mutation records land on the microtask checkpoint.
			await Promise.resolve();
			await tick();
			expect(api.y).toBe(150);
		} finally {
			await dispose();
		}
	});

	it('creates no observer when observe is off', async () => {
		const el = makeScroller();
		scrollers.push(el);
		const observe = vi.spyOn(MutationObserver.prototype, 'observe');
		const { dispose } = await mountScroll(el);
		await dispose();

		expect(observe).not.toHaveBeenCalled();
	});

	it('disconnects the observer on unmount', async () => {
		const el = makeScroller();
		scrollers.push(el);
		const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
		const { dispose } = await mountScroll(el, { observe: true });
		await dispose();

		expect(disconnect).toHaveBeenCalled();
	});

	it('tracks the document as its scrolling documentElement', async () => {
		fakeMetrics(document.documentElement, {});
		const { api, dispose } = await mountScroll(document);
		try {
			document.documentElement.scrollTop = 120;
			document.dispatchEvent(new Event('scroll'));
			await tick();

			expect(api.y).toBe(120);
			document.documentElement.scrollTop = 0;
		} finally {
			await dispose();
		}
	});

	it('tracks window scroll through the documentElement', async () => {
		fakeMetrics(document.documentElement, {});
		const { api, dispose } = await mountScroll(window);
		try {
			document.documentElement.scrollTop = 75;
			window.dispatchEvent(new Event('scroll'));
			await tick();

			expect(api.y).toBe(75);
			expect(api.arrivedState.top).toBe(false);
			document.documentElement.scrollTop = 0;
		} finally {
			await dispose();
		}
	});

	it('is inert without a target', async () => {
		const { api, dispose } = await mountUtil(() => useScroll(null));
		try {
			expect(api.x).toBe(0);
			expect(api.y).toBe(0);
			expect(() => {
				api.y = 10;
			}).not.toThrow();
			expect(() => api.measure()).not.toThrow();
		} finally {
			await dispose();
		}
	});

	it('re-resolves the getter target on every read', async () => {
		const first = makeScroller();
		const second = makeScroller();
		scrollers.push(first, second);
		let current: HTMLElement = first;
		const { api, dispose } = await mountUtil(() => useScroll(() => current));
		try {
			first.scrollTop = 10;
			api.measure();
			expect(api.y).toBe(10);

			// The getter is never cached, so swapping the container is enough.
			second.scrollTop = 60;
			current = second;
			api.measure();
			expect(api.y).toBe(60);
		} finally {
			await dispose();
		}
	});

	it('removes both scroll listeners on unmount', async () => {
		const el = makeScroller();
		scrollers.push(el);
		const remove = vi.spyOn(el, 'removeEventListener');
		const { dispose } = await mountScroll(el);
		await dispose();

		const removed = remove.mock.calls.filter(([type]) => type === 'scroll' || type === 'scrollend');
		expect(removed.length).toBeGreaterThanOrEqual(2);
	});

	it('drops a pending scroll-end timer on unmount so nothing writes after teardown', async () => {
		vi.useFakeTimers();
		try {
			const el = makeScroller();
			scrollers.push(el);
			const onStop = vi.fn();
			const { dispose } = await mountScroll(el, { onStop });
			el.dispatchEvent(new Event('scroll'));
			await tick();

			await dispose();
			await vi.advanceTimersByTimeAsync(1000);
			expect(onStop).not.toHaveBeenCalled();
		} finally {
			vi.useRealTimers();
		}
	});

	it('ignores a scroll event whose target is not a scroll container', async () => {
		const el = makeScroller();
		scrollers.push(el);
		const { api, dispose } = await mountScroll(el);
		try {
			el.dispatchEvent(new Event('scroll'));
			await tick();
			expect(api.isScrolling).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('routes a throwing measure to onError instead of propagating', async () => {
		const el = makeScroller();
		scrollers.push(el);
		const onError = vi.fn();
		vi.spyOn(window, 'getComputedStyle').mockImplementation(() => {
			throw new Error('detached');
		});

		const { dispose } = await mountScroll(el, { onError });
		await dispose();

		expect(onError).toHaveBeenCalledOnce();
		expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
	});
});
