// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountUtil } from '../../../../test/fixtures/mount.ts';
import { useTimeoutFn } from './index.ts';

afterEach(() => {
	vi.useRealTimers();
});

describe('useTimeoutFn', () => {
	it('auto-arms on mount and fires once', async () => {
		vi.useFakeTimers();
		const spy = vi.fn();
		const { api, dispose } = await mountUtil(() => useTimeoutFn(spy, 200));
		try {
			expect(api.isPending).toBe(true);
			vi.advanceTimersByTime(199);
			expect(spy).not.toHaveBeenCalled();
			vi.advanceTimersByTime(1);
			expect(spy).toHaveBeenCalledTimes(1);
			expect(api.isPending).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('stays idle with immediate:false until start', async () => {
		vi.useFakeTimers();
		const spy = vi.fn();
		const { api, dispose } = await mountUtil(() => useTimeoutFn(spy, 200, { immediate: false }));
		try {
			expect(api.isPending).toBe(false);
			vi.advanceTimersByTime(500);
			expect(spy).not.toHaveBeenCalled();
			api.start();
			expect(api.isPending).toBe(true);
			vi.advanceTimersByTime(200);
			expect(spy).toHaveBeenCalledTimes(1);
		} finally {
			await dispose();
		}
	});

	it('stop disarms and is safe to repeat', async () => {
		vi.useFakeTimers();
		const spy = vi.fn();
		const { api, dispose } = await mountUtil(() => useTimeoutFn(spy, 200));
		try {
			api.stop();
			api.stop();
			expect(api.isPending).toBe(false);
			vi.advanceTimersByTime(500);
			expect(spy).not.toHaveBeenCalled();
		} finally {
			await dispose();
		}
	});

	it('restarting clears the previous timer and forwards args', async () => {
		vi.useFakeTimers();
		const spy = vi.fn();
		const { api, dispose } = await mountUtil(() => useTimeoutFn(spy, 200, { immediate: false }));
		try {
			api.start('a');
			vi.advanceTimersByTime(150);
			api.start('b');
			vi.advanceTimersByTime(150);
			expect(spy).not.toHaveBeenCalled();
			vi.advanceTimersByTime(50);
			expect(spy).toHaveBeenCalledTimes(1);
			expect(spy).toHaveBeenCalledWith('b');
		} finally {
			await dispose();
		}
	});

	it('immediateCallback fires synchronously alongside the delayed one', async () => {
		vi.useFakeTimers();
		const spy = vi.fn();
		const { api, dispose } = await mountUtil(() =>
			useTimeoutFn(spy, 200, { immediate: false, immediateCallback: true })
		);
		try {
			api.start();
			expect(spy).toHaveBeenCalledTimes(1);
			vi.advanceTimersByTime(200);
			expect(spy).toHaveBeenCalledTimes(2);
		} finally {
			await dispose();
		}
	});

	it('immediateCallback also fires for the mount-armed timer', async () => {
		vi.useFakeTimers();
		const spy = vi.fn();
		const { api, dispose } = await mountUtil(() =>
			useTimeoutFn(spy, 200, { immediateCallback: true })
		);
		try {
			expect(spy).toHaveBeenCalledTimes(1);
			vi.advanceTimersByTime(200);
			expect(spy).toHaveBeenCalledTimes(2);
		} finally {
			await dispose();
		}
	});

	it('reads a reactive interval at each start', async () => {
		vi.useFakeTimers();
		const period = createBox(100);
		const spy = vi.fn();
		const { api, dispose } = await mountUtil(() =>
			useTimeoutFn(spy, () => period.value, { immediate: false })
		);
		try {
			api.start();
			vi.advanceTimersByTime(100);
			expect(spy).toHaveBeenCalledTimes(1);
			period.value = 300;
			api.start();
			vi.advanceTimersByTime(100);
			expect(spy).toHaveBeenCalledTimes(1);
			vi.advanceTimersByTime(200);
			expect(spy).toHaveBeenCalledTimes(2);
		} finally {
			await dispose();
		}
	});

	it('isPending re-reads state rather than snapshotting it', async () => {
		vi.useFakeTimers();
		const spy = vi.fn();
		const { api, dispose } = await mountUtil(() => useTimeoutFn(spy, 100, { immediate: false }));
		try {
			expect(api.isPending).toBe(false);
			api.start();
			expect(api.isPending).toBe(true);
			api.start();
			expect(api.isPending).toBe(true);
			api.stop();
			expect(api.isPending).toBe(false);
			vi.advanceTimersByTime(100);
			expect(api.isPending).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('disarms a pending timer on unmount', async () => {
		vi.useFakeTimers();
		const spy = vi.fn();
		const { api, dispose } = await mountUtil(() => useTimeoutFn(spy, 1000, { immediate: false }));
		api.start();
		await dispose();
		vi.advanceTimersByTime(2000);
		expect(spy).not.toHaveBeenCalled();
	});
});
