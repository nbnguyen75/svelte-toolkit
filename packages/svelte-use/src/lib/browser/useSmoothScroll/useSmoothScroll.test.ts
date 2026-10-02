// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

import { mountUtil } from '../../../../test/fixtures/mount.ts';
import { useSmoothScroll, type UseSmoothScrollReturn } from './index.ts';

/**
 * Advance fake timers past a tween to completion. Svelte's `Tween` is
 * driven by an internal rAF loop that reads `performance.now()`, so faking
 * timers (which fake both) is what makes the animation deterministic —
 * stepping a manual rAF would leave `now()` frozen and stall forever.
 */
async function runTween(duration: number): Promise<void> {
	await vi.advanceTimersByTimeAsync(duration + 32);
}

function makeScrollable(top: number): HTMLElement {
	const el = document.createElement('div');
	el.scrollTop = top;
	document.body.appendChild(el);
	return el;
}

/** A positioned child, so the container can resolve an absolute target. */
function makeChild(container: HTMLElement, top: number): HTMLElement {
	const child = document.createElement('div');
	child.getBoundingClientRect = () => ({ top, left: 0 }) as DOMRect;
	container.appendChild(child);
	return child;
}

describe('useSmoothScroll', () => {
	it('tweens a container to a numeric offset and resolves', async () => {
		vi.useFakeTimers();
		const el = makeScrollable(500);
		const { api, dispose } = await mountUtil(() => useSmoothScroll(() => el, { duration: 100 }));
		try {
			const shaped: UseSmoothScrollReturn = api;
			expect(shaped.scrolling).toBe(false);
			const done = shaped.scrollTo(0);
			expect(shaped.scrolling).toBe(true);
			await vi.advanceTimersByTimeAsync(50);
			expect(el.scrollTop).toBeGreaterThan(0);
			expect(el.scrollTop).toBeLessThan(500);
			await runTween(100);
			await done;
			expect(el.scrollTop).toBe(0);
			expect(shaped.scrolling).toBe(false);
		} finally {
			vi.useRealTimers();
			el.remove();
			await dispose();
		}
	});

	it('tweens to a non-zero offset', async () => {
		vi.useFakeTimers();
		const el = makeScrollable(0);
		const { api, dispose } = await mountUtil(() => useSmoothScroll(() => el, { duration: 100 }));
		try {
			const done = api.scrollTo(250);
			await runTween(100);
			await done;
			expect(el.scrollTop).toBe(250);
		} finally {
			vi.useRealTimers();
			el.remove();
			await dispose();
		}
	});

	it('resolves an element target against the container scroll position', async () => {
		vi.useFakeTimers();
		const el = makeScrollable(0);
		el.getBoundingClientRect = () => ({ top: 0, left: 0 }) as DOMRect;
		const child = makeChild(el, 400);
		const { api, dispose } = await mountUtil(() => useSmoothScroll(() => el, { duration: 100 }));
		try {
			const done = api.scrollTo(child);
			await runTween(100);
			await done;
			// 400 (rect) - 0 (container rect) + 0 (scrollTop)
			expect(el.scrollTop).toBe(400);
		} finally {
			vi.useRealTimers();
			el.remove();
			await dispose();
		}
	});

	it('a per-call container overrides the one bound at init', async () => {
		vi.useFakeTimers();
		const bound = makeScrollable(0);
		const other = makeScrollable(0);
		const { api, dispose } = await mountUtil(() => useSmoothScroll(() => bound, { duration: 100 }));
		try {
			const done = api.scrollTo(120, { container: other });
			await runTween(100);
			await done;
			expect(other.scrollTop).toBe(120);
			expect(bound.scrollTop).toBe(0);
		} finally {
			vi.useRealTimers();
			bound.remove();
			other.remove();
			await dispose();
		}
	});

	it('cancel aborts an in-flight animation without further writes', async () => {
		vi.useFakeTimers();
		const el = makeScrollable(500);
		const { api, dispose } = await mountUtil(() => useSmoothScroll(() => el, { duration: 400 }));
		try {
			const done = api.scrollTo(0);
			await vi.advanceTimersByTimeAsync(80);
			expect(api.scrolling).toBe(true);
			expect(el.scrollTop).toBeGreaterThan(0);
			api.cancel();
			expect(api.scrolling).toBe(false);
			const stoppedAt = el.scrollTop;
			await vi.advanceTimersByTimeAsync(400);
			expect(el.scrollTop).toBe(stoppedAt);
			await done;
			expect(api.scrolling).toBe(false);
		} finally {
			vi.useRealTimers();
			el.remove();
			await dispose();
		}
	});

	it('a new call supersedes the previous animation', async () => {
		vi.useFakeTimers();
		const el = makeScrollable(500);
		const { api, dispose } = await mountUtil(() => useSmoothScroll(() => el, { duration: 200 }));
		try {
			const first = api.scrollTo(100);
			await vi.advanceTimersByTimeAsync(50);
			const second = api.scrollTo(0);
			await vi.advanceTimersByTimeAsync(300);
			await Promise.all([first, second]);
			expect(el.scrollTop).toBe(0);
			expect(api.scrolling).toBe(false);
		} finally {
			vi.useRealTimers();
			el.remove();
			await dispose();
		}
	});

	it('a user wheel event interrupts the animation', async () => {
		vi.useFakeTimers();
		const el = makeScrollable(500);
		const { api, dispose } = await mountUtil(() => useSmoothScroll(() => el, { duration: 400 }));
		try {
			const done = api.scrollTo(0);
			await vi.advanceTimersByTimeAsync(80);
			expect(api.scrolling).toBe(true);
			window.dispatchEvent(new Event('wheel'));
			expect(api.scrolling).toBe(false);
			const stoppedAt = el.scrollTop;
			await vi.advanceTimersByTimeAsync(400);
			expect(el.scrollTop).toBe(stoppedAt);
			await done;
		} finally {
			vi.useRealTimers();
			el.remove();
			await dispose();
		}
	});

	it('interruptOnUserScroll: false leaves the animation running', async () => {
		vi.useFakeTimers();
		const el = makeScrollable(500);
		const { api, dispose } = await mountUtil(() =>
			useSmoothScroll(() => el, { duration: 200, interruptOnUserScroll: false })
		);
		try {
			const done = api.scrollTo(0);
			await vi.advanceTimersByTimeAsync(50);
			window.dispatchEvent(new Event('wheel'));
			expect(api.scrolling).toBe(true);
			await runTween(200);
			await done;
			expect(el.scrollTop).toBe(0);
		} finally {
			vi.useRealTimers();
			el.remove();
			await dispose();
		}
	});

	it('removes interrupt listeners once the animation settles', async () => {
		vi.useFakeTimers();
		const remove = vi.spyOn(window, 'removeEventListener');
		const el = makeScrollable(500);
		const { api, dispose } = await mountUtil(() => useSmoothScroll(() => el, { duration: 100 }));
		try {
			const done = api.scrollTo(0);
			await runTween(100);
			await done;
			const removed = remove.mock.calls.map((call) => call[0]);
			expect(removed).toContain('wheel');
			expect(removed).toContain('touchstart');
			expect(removed).toContain('keydown');
		} finally {
			remove.mockRestore();
			vi.useRealTimers();
			el.remove();
			await dispose();
		}
	});

	it('cancel is a safe no-op when idle', async () => {
		vi.useFakeTimers();
		const el = makeScrollable(100);
		const { api, dispose } = await mountUtil(() => useSmoothScroll(() => el));
		try {
			api.cancel();
			api.cancel();
			expect(api.scrolling).toBe(false);
			expect(el.scrollTop).toBe(100);
		} finally {
			vi.useRealTimers();
			el.remove();
			await dispose();
		}
	});

	it('resolves immediately without a container', async () => {
		vi.useFakeTimers();
		const { api, dispose } = await mountUtil(() => useSmoothScroll(() => null));
		try {
			await api.scrollTo(0);
			expect(api.scrolling).toBe(false);
		} finally {
			vi.useRealTimers();
			await dispose();
		}
	});

	it('resolves immediately for a nullish target', async () => {
		vi.useFakeTimers();
		const el = makeScrollable(300);
		const { api, dispose } = await mountUtil(() => useSmoothScroll(() => el));
		try {
			await api.scrollTo(null);
			await api.scrollTo(undefined);
			expect(api.scrolling).toBe(false);
			expect(el.scrollTop).toBe(300);
		} finally {
			vi.useRealTimers();
			el.remove();
			await dispose();
		}
	});

	it('scrolls window by default', async () => {
		vi.useFakeTimers();
		// jsdom leaves scrollY at 0: define a start position so the tween
		// interpolates numbers.
		Object.defineProperty(window, 'scrollY', { configurable: true, value: 300 });
		const scrollTo = vi.fn();
		window.scrollTo = scrollTo;
		const { api, dispose } = await mountUtil(() => useSmoothScroll(undefined, { duration: 100 }));
		try {
			const done = api.scrollTo(0);
			await runTween(100);
			await done;
			expect(scrollTo).toHaveBeenCalled();
			expect(scrollTo).toHaveBeenLastCalledWith(0, 0);
		} finally {
			vi.useRealTimers();
			await dispose();
		}
	});

	it('disposes an in-flight animation on unmount without stale writes', async () => {
		vi.useFakeTimers();
		const el = makeScrollable(500);
		const { api, dispose } = await mountUtil(() => useSmoothScroll(() => el, { duration: 400 }));
		try {
			const done = api.scrollTo(0);
			await vi.advanceTimersByTimeAsync(80);
			expect(api.scrolling).toBe(true);
			const stoppedAt = el.scrollTop;
			await dispose();
			await vi.advanceTimersByTimeAsync(400);
			await done;
			expect(api.scrolling).toBe(false);
			expect(el.scrollTop).toBe(stoppedAt);
			el.remove();
		} finally {
			vi.useRealTimers();
		}
	});
});
