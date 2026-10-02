// @vitest-environment jsdom
import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountUtil } from '../../../../test/fixtures/mount.ts';
import { watchTriggerable } from './index.ts';

describe('watchTriggerable', () => {
	it('trigger runs the callback now with the current value', async () => {
		const box = createBox(5);
		const spy = vi.fn();
		const { api, dispose } = await mountUtil(() =>
			watchTriggerable(
				() => box.value,
				(...args) => spy(...args)
			)
		);
		try {
			api.trigger();
			expect(spy).toHaveBeenCalledTimes(1);
			expect(spy.mock.calls[0]?.[0]).toBe(5);
			expect(spy.mock.calls[0]?.[1]).toBeUndefined();

			await tick();
			expect(spy).toHaveBeenCalledTimes(1);
		} finally {
			await dispose();
		}
	});

	it('trigger returns the callback result', async () => {
		const box = createBox(5);
		const { api, dispose } = await mountUtil(() =>
			watchTriggerable(
				() => box.value,
				(value) => value * 2
			)
		);
		try {
			expect(api.trigger()).toBe(10);
		} finally {
			await dispose();
		}
	});

	it('notifies on source changes with old and new values', async () => {
		const box = createBox(0);
		const spy = vi.fn();
		const { dispose } = await mountUtil(() =>
			watchTriggerable(
				() => box.value,
				(...args) => spy(...args)
			)
		);
		try {
			box.value = 1;
			await tick();
			expect(spy).toHaveBeenCalledTimes(1);
			expect(spy).toHaveBeenCalledWith(1, 0, expect.any(Function));
		} finally {
			await dispose();
		}
	});

	it('forwards silence controls and stop', async () => {
		const box = createBox(0);
		const spy = vi.fn();
		const { api, dispose } = await mountUtil(() =>
			watchTriggerable(
				() => box.value,
				(...args) => spy(...args)
			)
		);
		try {
			api.ignoreUpdates(() => {
				box.value = 50;
			});
			await tick();
			expect(spy).not.toHaveBeenCalled();

			api.trigger();
			expect(spy).toHaveBeenCalledTimes(1);

			api.stop();
			box.value = 51;
			await tick();
			expect(spy).toHaveBeenCalledTimes(1);
		} finally {
			await dispose();
		}
	});

	it('runs the previous cleanup before a manual trigger', async () => {
		const box = createBox(0);
		const order: string[] = [];
		const { api, dispose } = await mountUtil(() =>
			watchTriggerable(
				() => box.value,
				(value, _old, onCleanup) => {
					order.push(`cb:${value}`);
					onCleanup(() => order.push('cleanup'));
				}
			)
		);
		try {
			box.value = 1;
			await tick();
			expect(order).toEqual(['cb:1']);

			api.trigger();
			expect(order).toEqual(['cb:1', 'cleanup', 'cb:1']);
		} finally {
			await dispose();
		}
	});

	it('runs the pending cleanup when the owner unmounts', async () => {
		const box = createBox(0);
		const cleanup = vi.fn();
		const { dispose } = await mountUtil(() =>
			watchTriggerable(
				() => box.value,
				(_value, _old, onCleanup) => {
					onCleanup(cleanup);
				}
			)
		);
		box.value = 1;
		await tick();
		expect(cleanup).not.toHaveBeenCalled();

		await dispose();
		expect(cleanup).toHaveBeenCalledTimes(1);
	});
});
