// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

import { mountUtil } from '../../../../test/fixtures/mount.ts';
import { mockRaf } from '../../../../test/fixtures/raf.ts';
import type { UseRafFnCallbackArguments } from './index.ts';
import { useRafFn } from './index.ts';

describe('useRafFn', () => {
	it('runs every frame with delta and timestamp', async () => {
		const raf = mockRaf();
		const seen: UseRafFnCallbackArguments[] = [];
		const { api, dispose } = await mountUtil(() =>
			useRafFn((args) => {
				seen.push(args);
			})
		);
		try {
			expect(api.isActive).toBe(true);
			// The first frame only establishes the baseline, so delta is 0.
			raf.step(1000);
			raf.step(1016);
			raf.step(1032);
			expect(seen).toEqual([
				{ delta: 0, timestamp: 1000 },
				{ delta: 16, timestamp: 1016 },
				{ delta: 16, timestamp: 1032 }
			]);
		} finally {
			await dispose();
		}
	});

	it('pauses and resumes, and pause cancels the pending frame', async () => {
		const raf = mockRaf();
		const spy = vi.fn();
		const { api, dispose } = await mountUtil(() => useRafFn(spy));
		try {
			raf.step(1000);
			expect(spy).toHaveBeenCalledTimes(1);
			api.pause();
			api.pause();
			expect(api.isActive).toBe(false);
			expect(raf.pending).toBe(false);
			raf.step(2000);
			expect(spy).toHaveBeenCalledTimes(1);
			api.resume();
			expect(api.isActive).toBe(true);
			// Resuming resets the baseline, so this frame reports delta 0 again.
			raf.step(3000);
			expect(spy).toHaveBeenCalledTimes(2);
			expect(spy).toHaveBeenLastCalledWith({ delta: 0, timestamp: 3000 });
		} finally {
			await dispose();
		}
	});

	it('stays idle with immediate:false until resume', async () => {
		const raf = mockRaf();
		const spy = vi.fn();
		const { api, dispose } = await mountUtil(() => useRafFn(spy, { immediate: false }));
		try {
			expect(api.isActive).toBe(false);
			expect(raf.pending).toBe(false);
			api.resume();
			raf.step(1000);
			expect(spy).toHaveBeenCalledTimes(1);
		} finally {
			await dispose();
		}
	});

	it('stops after one frame with once:true', async () => {
		const raf = mockRaf();
		const spy = vi.fn();
		const { api, dispose } = await mountUtil(() => useRafFn(spy, { once: true }));
		try {
			raf.step(1000);
			expect(spy).toHaveBeenCalledTimes(1);
			expect(api.isActive).toBe(false);
			expect(raf.pending).toBe(false);
			raf.step(2000);
			expect(spy).toHaveBeenCalledTimes(1);
		} finally {
			await dispose();
		}
	});

	it('skips frames inside the fpsLimit budget', async () => {
		const raf = mockRaf();
		const spy = vi.fn();
		const { dispose } = await mountUtil(() => useRafFn(spy, { fpsLimit: 10 }));
		try {
			// The baseline frame is inside the 100ms budget, so it is skipped.
			raf.step(1000);
			expect(spy).not.toHaveBeenCalled();
			raf.step(1050);
			expect(spy).not.toHaveBeenCalled();
			// Past the budget: executes, carrying the full elapsed delta.
			raf.step(1100);
			expect(spy).toHaveBeenCalledTimes(1);
			expect(spy).toHaveBeenLastCalledWith({ delta: 100, timestamp: 1100 });
		} finally {
			await dispose();
		}
	});

	it('resolves a reactive fpsLimit per frame', async () => {
		let limit: number | null = null;
		const raf = mockRaf();
		const spy = vi.fn();
		const { dispose } = await mountUtil(() => useRafFn(spy, { fpsLimit: () => limit }));
		try {
			raf.step(1000);
			raf.step(1016);
			expect(spy).toHaveBeenCalledTimes(2);
			limit = 10;
			raf.step(1032);
			expect(spy).toHaveBeenCalledTimes(2);
			raf.step(1132);
			expect(spy).toHaveBeenCalledTimes(3);
		} finally {
			await dispose();
		}
	});

	it('honours pause() called from inside the callback', async () => {
		const raf = mockRaf();
		let api: ReturnType<typeof useRafFn>;
		const spy = vi.fn(() => api.pause());
		const mounted = await mountUtil(() => {
			api = useRafFn(spy);
			return api;
		});
		try {
			raf.step(1000);
			expect(spy).toHaveBeenCalledTimes(1);
			expect(api.isActive).toBe(false);
			raf.step(1016);
			expect(spy).toHaveBeenCalledTimes(1);
		} finally {
			await mounted.dispose();
		}
	});

	it('cancels the loop on unmount', async () => {
		const raf = mockRaf();
		const spy = vi.fn();
		const { api, dispose } = await mountUtil(() => useRafFn(spy));
		raf.step(1000);
		expect(spy).toHaveBeenCalledTimes(1);
		await dispose();
		expect(api.isActive).toBe(false);
		raf.step(2000);
		expect(spy).toHaveBeenCalledTimes(1);
	});
});
