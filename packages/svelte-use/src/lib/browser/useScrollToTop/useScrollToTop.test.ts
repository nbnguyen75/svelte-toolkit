// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

import { mountUtil } from '../../../../test/fixtures/mount.ts';
import { useScrollToTop, type UseScrollToTopReturn } from './index.ts';

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

describe('useScrollToTop', () => {
	it('tweens an element to the top and resolves', async () => {
		vi.useFakeTimers();
		const el = makeScrollable(500);
		const { api, dispose } = await mountUtil(() => useScrollToTop(() => el, { duration: 100 }));
		try {
			const shaped: UseScrollToTopReturn = api;
			expect(shaped.scrolling).toBe(false);
			const done = shaped.scrollToTop();
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

	it('cancel aborts an in-flight animation without further writes', async () => {
		vi.useFakeTimers();
		const el = makeScrollable(500);
		const { api, dispose } = await mountUtil(() => useScrollToTop(() => el, { duration: 400 }));
		try {
			const done = api.scrollToTop();
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
		const { api, dispose } = await mountUtil(() => useScrollToTop(() => el, { duration: 200 }));
		try {
			const first = api.scrollToTop();
			await vi.advanceTimersByTimeAsync(50);
			const second = api.scrollToTop();
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

	it('cancel is a safe no-op when idle', async () => {
		vi.useFakeTimers();
		const el = makeScrollable(100);
		const { api, dispose } = await mountUtil(() => useScrollToTop(() => el));
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

	it('resolves immediately without a target', async () => {
		vi.useFakeTimers();
		const { api, dispose } = await mountUtil(() => useScrollToTop(() => null));
		try {
			await api.scrollToTop();
			expect(api.scrolling).toBe(false);
		} finally {
			vi.useRealTimers();
			await dispose();
		}
	});

	it('scrolls window to the top by default', async () => {
		vi.useFakeTimers();
		// jsdom leaves scrollY at 0: define a start position so the tween
		// interpolates numbers.
		Object.defineProperty(window, 'scrollY', { configurable: true, value: 300 });
		const scrollTo = vi.fn();
		window.scrollTo = scrollTo;
		const { api, dispose } = await mountUtil(() => useScrollToTop(undefined, { duration: 100 }));
		try {
			const done = api.scrollToTop();
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
		const { api, dispose } = await mountUtil(() => useScrollToTop(() => el, { duration: 400 }));
		try {
			const done = api.scrollToTop();
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
