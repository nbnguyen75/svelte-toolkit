// @vitest-environment jsdom
import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountUtil } from '../../../../test/fixtures/mount.ts';
import { watchArray } from './index.ts';

describe('watchArray', () => {
	it('reports added and removed items', async () => {
		const box = createBox([1, 2, 3]);
		const spy = vi.fn();
		const { dispose } = await mountUtil(() =>
			watchArray(
				() => box.value,
				(...args) => spy(...args)
			)
		);
		try {
			box.value = [1, 4, 3, 5];
			await tick();
			expect(spy).toHaveBeenCalledTimes(1);
			const [value, oldValue, added, removed] = spy.mock.calls[0] as [
				number[],
				number[],
				number[],
				number[]
			];
			expect(value).toEqual([1, 4, 3, 5]);
			expect(oldValue).toEqual([1, 2, 3]);
			expect(added).toEqual([4, 5]);
			expect(removed).toEqual([2]);
		} finally {
			await dispose();
		}
	});

	it('matches duplicates one-to-one', async () => {
		const box = createBox([1, 2, 1]);
		const spy = vi.fn();
		const { dispose } = await mountUtil(() =>
			watchArray(
				() => box.value,
				(...args) => spy(...args)
			)
		);
		try {
			box.value = [1, 3];
			await tick();
			const [, , added, removed] = spy.mock.calls[0] as [unknown, unknown, number[], number[]];
			expect(added).toEqual([3]);
			expect(removed).toEqual([2, 1]);
		} finally {
			await dispose();
		}
	});

	it('stays quiet on mount without immediate', async () => {
		const box = createBox([1]);
		const spy = vi.fn();
		const { dispose } = await mountUtil(() =>
			watchArray(
				() => box.value,
				(...args) => spy(...args)
			)
		);
		try {
			await tick();
			expect(spy).not.toHaveBeenCalled();
		} finally {
			await dispose();
		}
	});

	it('fires on mount with immediate, old empty and added full', async () => {
		const box = createBox([1, 2]);
		const spy = vi.fn();
		const { dispose } = await mountUtil(() =>
			watchArray(
				() => box.value,
				(...args) => spy(...args),
				{ immediate: true }
			)
		);
		try {
			await tick();
			expect(spy).toHaveBeenCalledTimes(1);
			const [value, oldValue, added, removed] = spy.mock.calls[0] as [
				number[],
				number[],
				number[],
				number[]
			];
			expect(value).toEqual([1, 2]);
			expect(oldValue).toEqual([]);
			expect(added).toEqual([1, 2]);
			expect(removed).toEqual([]);
		} finally {
			await dispose();
		}
	});

	it('stop ignores later changes', async () => {
		const box = createBox([1]);
		const spy = vi.fn();
		let stop: (() => void) | undefined;
		const { dispose } = await mountUtil(() => {
			stop = watchArray(
				() => box.value,
				(...args) => spy(...args)
			);
			return stop;
		});
		try {
			stop?.();
			box.value = [2];
			await tick();
			expect(spy).not.toHaveBeenCalled();
		} finally {
			await dispose();
		}
	});

	it('runs previous cleanup before the next callback and on stop', async () => {
		const box = createBox([1]);
		const order: string[] = [];
		let stop: (() => void) | undefined;
		const { dispose } = await mountUtil(() => {
			stop = watchArray(
				() => box.value,
				(value, _old, _added, _removed, onCleanup) => {
					order.push(`cb:${value.join(',')}`);
					onCleanup(() => order.push('cleanup'));
				}
			);
			return stop;
		});
		try {
			box.value = [2];
			await tick();
			box.value = [3];
			await tick();
			expect(order).toEqual(['cb:2', 'cleanup', 'cb:3']);
			stop?.();
			expect(order).toEqual(['cb:2', 'cleanup', 'cb:3', 'cleanup']);
		} finally {
			await dispose();
		}
	});

	it('runs the pending cleanup when the owner unmounts', async () => {
		const box = createBox([1]);
		const cleanup = vi.fn();
		const { dispose } = await mountUtil(() =>
			watchArray(
				() => box.value,
				(_value, _old, _added, _removed, onCleanup) => {
					onCleanup(cleanup);
				}
			)
		);
		box.value = [2];
		await tick();
		expect(cleanup).not.toHaveBeenCalled();

		await dispose();
		expect(cleanup).toHaveBeenCalledTimes(1);
	});
});
