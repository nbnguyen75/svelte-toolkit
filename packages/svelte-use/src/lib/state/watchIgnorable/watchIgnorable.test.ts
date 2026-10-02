// @vitest-environment jsdom
import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountUtil } from '../../../../test/fixtures/mount.ts';
import { watchIgnorable } from './index.ts';

describe('watchIgnorable', () => {
	it('fires with the new and previous values', async () => {
		const box = createBox(0);
		const spy = vi.fn();
		const { dispose } = await mountUtil(() =>
			watchIgnorable(
				() => box.value,
				(value, oldValue) => spy(value, oldValue)
			)
		);
		try {
			box.value = 1;
			await tick();
			expect(spy).toHaveBeenCalledTimes(1);
			expect(spy).toHaveBeenCalledWith(1, 0);
		} finally {
			await dispose();
		}
	});

	it('does not fire when a write leaves the value unchanged', async () => {
		const box = createBox(5);
		const spy = vi.fn();
		const { dispose } = await mountUtil(() =>
			watchIgnorable(
				() => box.value,
				() => spy()
			)
		);
		try {
			box.value = 5;
			await tick();
			expect(spy).not.toHaveBeenCalled();
		} finally {
			await dispose();
		}
	});

	it('ignoreUpdates drops exactly the wrapped mutation', async () => {
		const box = createBox(0);
		const spy = vi.fn();
		const { api, dispose } = await mountUtil(() =>
			watchIgnorable(
				() => box.value,
				(value, oldValue) => spy(value, oldValue)
			)
		);
		try {
			api.ignoreUpdates(() => {
				box.value = 99;
			});
			await tick();
			expect(spy).not.toHaveBeenCalled();

			box.value = 100;
			await tick();
			expect(spy).toHaveBeenCalledTimes(1);
			expect(spy).toHaveBeenCalledWith(100, 99);
		} finally {
			await dispose();
		}
	});

	it('ignorePrevAsyncUpdates drops the next change', async () => {
		const box = createBox(0);
		const spy = vi.fn();
		const { api, dispose } = await mountUtil(() =>
			watchIgnorable(
				() => box.value,
				() => spy()
			)
		);
		try {
			box.value = 1;
			api.ignorePrevAsyncUpdates();
			await tick();
			expect(spy).not.toHaveBeenCalled();

			box.value = 2;
			await tick();
			expect(spy).toHaveBeenCalledTimes(1);
		} finally {
			await dispose();
		}
	});

	it('fires once on mount with immediate:true and no old value', async () => {
		const box = createBox(7);
		const spy = vi.fn();
		const { dispose } = await mountUtil(() =>
			watchIgnorable(
				() => box.value,
				(value, oldValue) => spy(value, oldValue),
				{ immediate: true }
			)
		);
		try {
			await tick();
			expect(spy).toHaveBeenCalledTimes(1);
			expect(spy).toHaveBeenCalledWith(7, undefined);
		} finally {
			await dispose();
		}
	});

	it('stop halts changes and runs the pending cleanup', async () => {
		const box = createBox(0);
		const order: string[] = [];
		const { api, dispose } = await mountUtil(() =>
			watchIgnorable(
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

			api.stop();
			expect(order).toEqual(['cb:1', 'cleanup']);

			box.value = 2;
			await tick();
			expect(order).toEqual(['cb:1', 'cleanup']);
		} finally {
			await dispose();
		}
	});

	it('runs the pending cleanup when the owner unmounts', async () => {
		const box = createBox(0);
		const cleanup = vi.fn();
		const { dispose } = await mountUtil(() =>
			watchIgnorable(
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
