// @vitest-environment jsdom
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountUtil } from '../../../../test/fixtures/mount.ts';
import { useIntervalFn } from './index.ts';

afterEach(() => {
	vi.useRealTimers();
});

describe('useIntervalFn', () => {
	it('auto-starts on mount and repeats', async () => {
		vi.useFakeTimers();
		const spy = vi.fn();
		const { api, dispose } = await mountUtil(() => useIntervalFn(spy, 100));
		try {
			expect(api.isActive).toBe(true);
			vi.advanceTimersByTime(350);
			expect(spy).toHaveBeenCalledTimes(3);
		} finally {
			await dispose();
		}
	});

	it('pauses and resumes, and pause is safe repeated', async () => {
		vi.useFakeTimers();
		const spy = vi.fn();
		const { api, dispose } = await mountUtil(() => useIntervalFn(spy, 100, { immediate: false }));
		try {
			expect(api.isActive).toBe(false);
			api.resume();
			expect(api.isActive).toBe(true);
			vi.advanceTimersByTime(200);
			expect(spy).toHaveBeenCalledTimes(2);
			api.pause();
			api.pause();
			expect(api.isActive).toBe(false);
			vi.advanceTimersByTime(500);
			expect(spy).toHaveBeenCalledTimes(2);
			api.resume();
			vi.advanceTimersByTime(100);
			expect(spy).toHaveBeenCalledTimes(3);
		} finally {
			await dispose();
		}
	});

	it('ignores non-positive periods', async () => {
		vi.useFakeTimers();
		const spy = vi.fn();
		const { api, dispose } = await mountUtil(() => useIntervalFn(spy, 0));
		try {
			expect(api.isActive).toBe(false);
			vi.advanceTimersByTime(1000);
			expect(spy).not.toHaveBeenCalled();
			api.resume();
			expect(api.isActive).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('defaults the period to 1000ms', async () => {
		vi.useFakeTimers();
		const spy = vi.fn();
		const { dispose } = await mountUtil(() => useIntervalFn(spy));
		try {
			vi.advanceTimersByTime(999);
			expect(spy).not.toHaveBeenCalled();
			vi.advanceTimersByTime(1);
			expect(spy).toHaveBeenCalledTimes(1);
		} finally {
			await dispose();
		}
	});

	it('immediateCallback invokes synchronously on resume', async () => {
		vi.useFakeTimers();
		const spy = vi.fn();
		const { api, dispose } = await mountUtil(() =>
			useIntervalFn(spy, 100, { immediate: false, immediateCallback: true })
		);
		try {
			api.resume();
			expect(spy).toHaveBeenCalledTimes(1);
			vi.advanceTimersByTime(100);
			expect(spy).toHaveBeenCalledTimes(2);
		} finally {
			await dispose();
		}
	});

	it('an immediateCallback that pauses leaves no live timer', async () => {
		vi.useFakeTimers();
		const { api, dispose } = await mountUtil(() =>
			useIntervalFn(() => api.pause(), 100, { immediate: false, immediateCallback: true })
		);
		try {
			api.resume();
			expect(api.isActive).toBe(false);
			vi.advanceTimersByTime(1000);
			expect(api.isActive).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('restarts at the new cadence when a reactive period changes', async () => {
		vi.useFakeTimers();
		const period = createBox(100);
		const spy = vi.fn();
		const { dispose } = await mountUtil(() => useIntervalFn(spy, () => period.value));
		try {
			vi.advanceTimersByTime(100);
			expect(spy).toHaveBeenCalledTimes(1);
			period.value = 200;
			// Flush the tracking effect so the timer restarts before advancing.
			await tick();
			vi.advanceTimersByTime(100);
			expect(spy).toHaveBeenCalledTimes(1);
			vi.advanceTimersByTime(100);
			expect(spy).toHaveBeenCalledTimes(2);
		} finally {
			await dispose();
		}
	});

	it('does not auto-resume while paused when the period changes', async () => {
		vi.useFakeTimers();
		const period = createBox(100);
		const spy = vi.fn();
		const { api, dispose } = await mountUtil(() => useIntervalFn(spy, () => period.value));
		try {
			api.pause();
			period.value = 200;
			await tick();
			expect(api.isActive).toBe(false);
			vi.advanceTimersByTime(1000);
			expect(spy).not.toHaveBeenCalled();
		} finally {
			await dispose();
		}
	});

	it('isActive re-reads state rather than snapshotting it', async () => {
		vi.useFakeTimers();
		const spy = vi.fn();
		const { api, dispose } = await mountUtil(() => useIntervalFn(spy, 100, { immediate: false }));
		try {
			expect(api.isActive).toBe(false);
			api.resume();
			expect(api.isActive).toBe(true);
			api.resume();
			expect(api.isActive).toBe(true);
			api.pause();
			expect(api.isActive).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('clears the interval on unmount', async () => {
		vi.useFakeTimers();
		const spy = vi.fn();
		const { dispose } = await mountUtil(() => useIntervalFn(spy, 100));
		vi.advanceTimersByTime(200);
		expect(spy).toHaveBeenCalledTimes(2);
		await dispose();
		vi.advanceTimersByTime(1000);
		expect(spy).toHaveBeenCalledTimes(2);
	});
});
