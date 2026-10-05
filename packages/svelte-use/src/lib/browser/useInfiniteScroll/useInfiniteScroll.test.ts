// @vitest-environment jsdom
/**
 * jsdom has no layout and no IntersectionObserver, so every test pins the scroll
 * metrics it needs and drives visibility through the shared observer mock.
 *
 * One consequence runs through the whole file: once a load settles, the edge is
 * checked again, so a container that stays "arrived" loads forever. That is the
 * intended fill-the-viewport behaviour, but jsdom metrics never change on their
 * own, so every load spy here either grows the content or closes `canLoadMore`
 * after the call under test.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mountInitialized } from '../../../../test/fixtures/mount.ts';
import { MockIntersectionObserver } from '../../../../test/fixtures/observers.ts';
import { useInfiniteScroll } from './index.ts';

/** Drains `setTimeout(0)` sleeps, microtasks, and the `tick()`s they schedule. */
async function flush(rounds = 5): Promise<void> {
	for (let i = 0; i < rounds; i++) await new Promise((resolve) => setTimeout(resolve, 0));
}

type Metrics = Partial<
	Record<
		'clientHeight' | 'scrollHeight' | 'scrollTop' | 'clientWidth' | 'scrollWidth' | 'scrollLeft',
		number
	>
>;

/** jsdom reports every metric as 0, which reads as "arrived and empty". */
function setMetrics(el: HTMLElement, metrics: Metrics): void {
	for (const [key, value] of Object.entries(metrics)) {
		Object.defineProperty(el, key, { configurable: true, value });
	}
}

/** A 50px viewport over 100px of content, scrolled to the bottom edge. */
const AT_BOTTOM = { clientHeight: 50, scrollHeight: 100, scrollTop: 60 } as const;
/** The same viewport, still 50px short of the bottom edge. */
const ABOVE_BOTTOM = { clientHeight: 50, scrollHeight: 100, scrollTop: 40 } as const;
/** Content as tall as the viewport, overscrolled: nothing to scroll, no edge. */
const SHORTER = { clientHeight: 50, scrollHeight: 50, scrollTop: -20 } as const;
/** At the left edge, nowhere near the bottom. */
const AT_LEFT = {
	...ABOVE_BOTTOM,
	scrollHeight: 400,
	clientWidth: 50,
	scrollWidth: 50,
	scrollLeft: 0
} as const;

const created: Element[] = [];

function box(metrics: Metrics): HTMLDivElement {
	const el = document.createElement('div');
	setMetrics(el, metrics);
	document.body.append(el);
	created.push(el);
	return el;
}

/** A load spy that grows the content past the watched edge on its first call. */
function loadEndingAt(
	el: HTMLElement,
	metrics: Metrics = { scrollHeight: 400 }
): ReturnType<typeof vi.fn> {
	return vi.fn(() => setMetrics(el, metrics));
}

beforeEach(() => {
	MockIntersectionObserver.install();
});

afterEach(() => {
	for (const el of created.splice(0)) el.remove();
	vi.restoreAllMocks();
	vi.useRealTimers();
});

describe('useInfiniteScroll', () => {
	it('does not load before the container is visible', async () => {
		const el = box(AT_BOTTOM);
		const load = loadEndingAt(el);
		const { api, dispose } = await mountInitialized(
			() => useInfiniteScroll(el, load, { interval: 0 }),
			() => {}
		);
		try {
			await flush();
			expect(load).not.toHaveBeenCalled();
			expect(api.isLoading).toBe(false);

			MockIntersectionObserver.triggerIntersecting(el, true);
			await flush();
			expect(load).toHaveBeenCalledTimes(1);
		} finally {
			await dispose();
		}
	});

	it('does not load before the edge arrives', async () => {
		const el = box(ABOVE_BOTTOM);
		const load = loadEndingAt(el);
		const { dispose } = await mountInitialized(
			() => useInfiniteScroll(el, load, { interval: 0 }),
			() => {}
		);
		try {
			MockIntersectionObserver.triggerIntersecting(el, true);
			await flush();
			expect(load).not.toHaveBeenCalled();

			setMetrics(el, AT_BOTTOM);
			el.dispatchEvent(new Event('scroll'));
			await flush();
			expect(load).toHaveBeenCalledTimes(1);
		} finally {
			await dispose();
		}
	});

	it('treats distance as the offset of the watched edge', async () => {
		const near = box(ABOVE_BOTTOM);
		const nearLoad = vi.fn();
		const { dispose } = await mountInitialized(
			() => useInfiniteScroll(near, nearLoad, { interval: 0 }),
			() => {}
		);
		try {
			MockIntersectionObserver.triggerIntersecting(near, true);
			await flush();
			expect(nearLoad).not.toHaveBeenCalled();
		} finally {
			await dispose();
		}

		const el = box(ABOVE_BOTTOM);
		const load = loadEndingAt(el);
		const { dispose: disposeFar } = await mountInitialized(
			() => useInfiniteScroll(el, load, { distance: 20, interval: 0 }),
			() => {}
		);
		try {
			MockIntersectionObserver.triggerIntersecting(el, true);
			await flush();
			expect(load).toHaveBeenCalledTimes(1);
		} finally {
			await disposeFar();
		}
	});

	it('loads when the content is shorter than the viewport', async () => {
		const el = box(SHORTER);
		const load = loadEndingAt(el);
		const { dispose } = await mountInitialized(
			() => useInfiniteScroll(el, load, { interval: 0 }),
			() => {}
		);
		try {
			MockIntersectionObserver.triggerIntersecting(el, true);
			await flush();
			expect(load).toHaveBeenCalledTimes(1);
		} finally {
			await dispose();
		}
	});

	it('watches the configured edge only', async () => {
		const vertical = box(AT_LEFT);
		const bottomLoad = vi.fn();
		const { dispose } = await mountInitialized(
			() => useInfiniteScroll(vertical, bottomLoad, { interval: 0 }),
			() => {}
		);
		try {
			MockIntersectionObserver.triggerIntersecting(vertical, true);
			await flush();
			expect(bottomLoad).not.toHaveBeenCalled();
		} finally {
			await dispose();
		}

		// `arrivedState.left` holds at the left edge no matter how tall the content
		// is, so the gate - not the size - is what ends this one.
		const horizontal = box(AT_LEFT);
		const leftLoad = vi.fn();
		const { dispose: disposeLeft } = await mountInitialized(
			() =>
				useInfiniteScroll(horizontal, leftLoad, {
					direction: 'left',
					canLoadMore: () => leftLoad.mock.calls.length < 1,
					interval: 0
				}),
			() => {}
		);
		try {
			MockIntersectionObserver.triggerIntersecting(horizontal, true);
			await flush();
			expect(leftLoad).toHaveBeenCalledTimes(1);
		} finally {
			await disposeLeft();
		}
	});

	it('skips the load when canLoadMore returns false', async () => {
		const el = box(AT_BOTTOM);
		const load = vi.fn();
		const canLoadMore = vi.fn(() => false);
		const { dispose } = await mountInitialized(
			() => useInfiniteScroll(el, load, { canLoadMore, interval: 0 }),
			() => {}
		);
		try {
			MockIntersectionObserver.triggerIntersecting(el, true);
			await flush();
			expect(canLoadMore).toHaveBeenCalledWith(el);
			expect(load).not.toHaveBeenCalled();
		} finally {
			await dispose();
		}
	});

	it('keeps loading while the content stays shorter than the viewport', async () => {
		const el = box(SHORTER);
		let hasMore = true;
		let calls = 0;
		const { dispose } = await mountInitialized(
			() =>
				useInfiniteScroll(
					el,
					() => {
						calls += 1;
						if (calls >= 3) hasMore = false;
					},
					{ canLoadMore: () => hasMore, interval: 0 }
				),
			() => {}
		);
		try {
			MockIntersectionObserver.triggerIntersecting(el, true);
			await flush(8);
			expect(calls).toBe(3);
		} finally {
			await dispose();
		}
	});

	it('reports isLoading while a load is in flight', async () => {
		const el = box(AT_BOTTOM);
		let release = (): void => {};
		let calls = 0;
		const readings: boolean[] = [];
		const { api, dispose } = await mountInitialized(
			() =>
				useInfiniteScroll(
					el,
					() => {
						calls += 1;
						if (calls > 1) return setMetrics(el, { scrollHeight: 400 });
						return new Promise<void>((resolve) => (release = resolve));
					},
					{ interval: 0 }
				),
			(value) => readings.push(value.isLoading)
		);
		try {
			MockIntersectionObserver.triggerIntersecting(el, true);
			await flush();
			expect(api.isLoading).toBe(true);
			expect(readings).toContain(true);

			release();
			await flush();
			expect(api.isLoading).toBe(false);
			expect(readings.at(-1)).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('passes the scroll state to onLoadMore', async () => {
		const el = box(AT_BOTTOM);
		let seen: { y: number } | undefined;
		const { dispose } = await mountInitialized(
			() =>
				useInfiniteScroll(
					el,
					(state) => {
						seen = { y: state.y };
						setMetrics(el, { scrollHeight: 400 });
					},
					{ interval: 0 }
				),
			() => {}
		);
		try {
			MockIntersectionObserver.triggerIntersecting(el, true);
			await flush();
			expect(seen).toEqual({ y: 60 });
		} finally {
			await dispose();
		}
	});

	it('re-checks after reset without a scroll event', async () => {
		const el = box(ABOVE_BOTTOM);
		const load = loadEndingAt(el);
		const { api, dispose } = await mountInitialized(
			() => useInfiniteScroll(el, load, { interval: 0 }),
			() => {}
		);
		try {
			MockIntersectionObserver.triggerIntersecting(el, true);
			await flush();
			expect(load).not.toHaveBeenCalled();

			setMetrics(el, AT_BOTTOM);
			api.reset();
			await flush();
			expect(load).toHaveBeenCalledTimes(1);
		} finally {
			await dispose();
		}
	});

	it('reports a rejected load and clears isLoading', async () => {
		const el = box(AT_BOTTOM);
		const failure = new Error('offline');
		const onError = vi.fn();
		let calls = 0;
		const { api, dispose } = await mountInitialized(
			() =>
				useInfiniteScroll(
					el,
					() => {
						calls += 1;
						// A synchronous throw, and then growth so the settled re-check stops.
						if (calls === 1) throw failure;
						setMetrics(el, { scrollHeight: 400 });
					},
					{ onError, interval: 0 }
				),
			() => {}
		);
		try {
			MockIntersectionObserver.triggerIntersecting(el, true);
			await flush();
			expect(onError).toHaveBeenCalledWith(failure);
			expect(api.isLoading).toBe(false);
			expect(calls).toBe(2);
		} finally {
			await dispose();
		}
	});

	it('logs a rejected load by default', async () => {
		const el = box(AT_BOTTOM);
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		let hasMore = true;
		const { dispose } = await mountInitialized(
			() =>
				useInfiniteScroll(
					el,
					() => {
						hasMore = false;
						throw new Error('offline');
					},
					{ canLoadMore: () => hasMore, interval: 0 }
				),
			() => {}
		);
		try {
			MockIntersectionObserver.triggerIntersecting(el, true);
			await flush();
			expect(consoleError).toHaveBeenCalledTimes(1);
		} finally {
			await dispose();
		}
	});

	it('observes the documentElement for a window target', async () => {
		const load = vi.fn();
		const { dispose } = await mountInitialized(
			() => useInfiniteScroll(() => window, load, { interval: 0 }),
			() => {}
		);
		try {
			await flush();
			// A `Window` cannot be observed, so it resolves to what scrolls as it.
			expect(MockIntersectionObserver.instances[0].observed).toEqual([document.documentElement]);
			expect(load).not.toHaveBeenCalled();
		} finally {
			await dispose();
		}
	});

	it('clears the pending interval timer on unmount', async () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		const el = box(AT_BOTTOM);
		const { dispose } = await mountInitialized(
			() => useInfiniteScroll(el, () => new Promise<void>(() => {}), { interval: 5000 }),
			() => {}
		);
		MockIntersectionObserver.triggerIntersecting(el, true);
		await vi.advanceTimersByTimeAsync(1);
		expect(vi.getTimerCount()).toBe(1);

		await dispose();
		expect(vi.getTimerCount()).toBe(0);
	});
});
