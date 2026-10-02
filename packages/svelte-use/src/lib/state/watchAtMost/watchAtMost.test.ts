// @vitest-environment jsdom
import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountUtil } from '../../../../test/fixtures/mount.ts';
import { watchAtMost } from './index.ts';

describe('watchAtMost', () => {
	it('stops after count invocations', async () => {
		const box = createBox(0);
		const spy = vi.fn();
		const { api, dispose } = await mountUtil(() =>
			watchAtMost(
				() => box.value,
				(...args) => spy(...args),
				{ count: 2 }
			)
		);
		try {
			expect(api.calls).toBe(0);
			box.value = 1;
			await tick();
			box.value = 2;
			await tick();
			box.value = 3;
			await tick();
			expect(spy).toHaveBeenCalledTimes(2);
			expect(api.calls).toBe(2);
			expect(spy.mock.calls[0]?.[0]).toBe(1);
			expect(spy.mock.calls[1]?.[0]).toBe(2);
		} finally {
			await dispose();
		}
	});

	it('counts the mount firing with immediate:true', async () => {
		const box = createBox(0);
		const spy = vi.fn();
		const { api, dispose } = await mountUtil(() =>
			watchAtMost(
				() => box.value,
				(...args) => spy(...args),
				{ count: 2, immediate: true }
			)
		);
		try {
			await tick();
			expect(spy).toHaveBeenCalledTimes(1);
			expect(spy.mock.calls[0]?.[1]).toBeUndefined();
			box.value = 1;
			await tick();
			expect(spy).toHaveBeenCalledTimes(2);
			expect(api.calls).toBe(2);
			box.value = 2;
			await tick();
			expect(spy).toHaveBeenCalledTimes(2);
		} finally {
			await dispose();
		}
	});

	it('pauses without catch-up and resumes fresh', async () => {
		const box = createBox(0);
		const spy = vi.fn();
		const { api, dispose } = await mountUtil(() =>
			watchAtMost(
				() => box.value,
				(...args) => spy(...args),
				{ count: 10 }
			)
		);
		try {
			api.pause();
			box.value = 1;
			await tick();
			expect(spy).not.toHaveBeenCalled();
			api.resume();
			await tick();
			expect(spy).not.toHaveBeenCalled();
			box.value = 2;
			await tick();
			expect(spy).toHaveBeenCalledTimes(1);
			expect(spy.mock.calls[0]?.[0]).toBe(2);
		} finally {
			await dispose();
		}
	});

	it('stop halts permanently', async () => {
		const box = createBox(0);
		const spy = vi.fn();
		const { api, dispose } = await mountUtil(() =>
			watchAtMost(
				() => box.value,
				(...args) => spy(...args),
				{ count: 10 }
			)
		);
		try {
			box.value = 1;
			await tick();
			expect(spy).toHaveBeenCalledTimes(1);
			api.stop();
			box.value = 2;
			await tick();
			expect(spy).toHaveBeenCalledTimes(1);
		} finally {
			await dispose();
		}
	});

	it('passes old values and honors a reactive count', async () => {
		const box = createBox(0);
		const limit = createBox(2);
		const spy = vi.fn();
		const { dispose } = await mountUtil(() =>
			watchAtMost(
				() => box.value,
				(...args) => spy(...args),
				{ count: () => limit.value }
			)
		);
		try {
			box.value = 1;
			await tick();
			expect(spy).toHaveBeenCalledTimes(1);
			expect(spy.mock.calls[0]?.[1]).toBe(0);
			limit.value = 1;
			box.value = 2;
			await tick();
			expect(spy).toHaveBeenCalledTimes(2);
			expect(spy.mock.calls[1]?.[1]).toBe(1);
			box.value = 3;
			await tick();
			expect(spy).toHaveBeenCalledTimes(2);
		} finally {
			await dispose();
		}
	});

	it('runs the pending cleanup when the owner unmounts', async () => {
		const box = createBox(0);
		const cleanup = vi.fn();
		const { dispose } = await mountUtil(() =>
			watchAtMost(
				() => box.value,
				(_value, _old, onCleanup) => {
					onCleanup(cleanup);
				},
				{ count: 10 }
			)
		);
		box.value = 1;
		await tick();
		expect(cleanup).not.toHaveBeenCalled();

		await dispose();
		expect(cleanup).toHaveBeenCalledTimes(1);
	});
});
