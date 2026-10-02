// @vitest-environment jsdom
import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountUtil } from '../../../../test/fixtures/mount.ts';
import { until } from './index.ts';

describe('until', () => {
	it('toBe resolves immediately when already matching', async () => {
		const box = createBox(1);
		const { api: promise, dispose } = await mountUtil(() => until(() => box.value).toBe(1));
		try {
			await expect(promise).resolves.toBe(1);
		} finally {
			await dispose();
		}
	});

	it('toBe waits for a later change', async () => {
		const box = createBox(0);
		const { api: promise, dispose } = await mountUtil(() => until(() => box.value).toBe(2));
		try {
			let settled = false;
			void promise.then(() => {
				settled = true;
			});
			box.value = 1;
			await tick();
			expect(settled).toBe(false);
			box.value = 2;
			await tick();
			await expect(promise).resolves.toBe(2);
			expect(settled).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('not inverts the condition', async () => {
		const box = createBox(true);
		const { api: promise, dispose } = await mountUtil(() => until(() => box.value).not.toBe(true));
		try {
			box.value = false;
			await tick();
			await expect(promise).resolves.toBe(false);
		} finally {
			await dispose();
		}
	});

	it('toMatch resolves on predicate truth', async () => {
		const box = createBox(3);
		const { api: promise, dispose } = await mountUtil(() =>
			until(() => box.value).toMatch((value) => value > 7)
		);
		try {
			box.value = 10;
			await tick();
			await expect(promise).resolves.toBe(10);
		} finally {
			await dispose();
		}
	});

	it('changed and changedTimes count changes', async () => {
		const box = createBox('a');
		const first = await mountUtil(() => until(() => box.value).changed());
		const second = await mountUtil(() => until(() => box.value).changedTimes(2));
		try {
			box.value = 'b';
			await tick();
			await expect(first.api).resolves.toBe('b');
			box.value = 'c';
			await tick();
			await expect(second.api).resolves.toBe('c');
		} finally {
			await first.dispose();
			await second.dispose();
		}
	});

	it('handles truthy/null/undefined/NaN matchers', async () => {
		const truthyBox = createBox<number | string>(0);
		const nullBox = createBox<null | number>(1);
		const undefinedBox = createBox<number | undefined>(1);
		const nanBox = createBox(1);
		const truthy = await mountUtil(() => until(() => truthyBox.value).toBeTruthy());
		const nullish = await mountUtil(() => until(() => nullBox.value).toBeNull());
		const undef = await mountUtil(() => until(() => undefinedBox.value).toBeUndefined());
		const nan = await mountUtil(() => until(() => nanBox.value).toBeNaN());
		try {
			truthyBox.value = 'yes';
			nullBox.value = null;
			undefinedBox.value = undefined;
			nanBox.value = Number.NaN;
			await tick();
			await expect(truthy.api).resolves.toBe('yes');
			await expect(nullish.api).resolves.toBeNull();
			await expect(undef.api).resolves.toBeUndefined();
			await expect(nan.api).resolves.toBeNaN();
		} finally {
			await truthy.dispose();
			await nullish.dispose();
			await undef.dispose();
			await nan.dispose();
		}
	});

	it('toContains resolves for array sources', async () => {
		const box = createBox([1, 2]);
		const { api: promise, dispose } = await mountUtil(() => until(() => box.value).toContains(3));
		try {
			box.value = [1, 2, 3];
			await tick();
			await expect(promise).resolves.toEqual([1, 2, 3]);
		} finally {
			await dispose();
		}
	});

	it('toBe tracks a getter target as well', async () => {
		const box = createBox(0);
		const target = createBox(2);
		const { api: promise, dispose } = await mountUtil(() =>
			until(() => box.value).toBe(() => target.value)
		);
		try {
			target.value = 0;
			await tick();
			await expect(promise).resolves.toBe(0);
		} finally {
			await dispose();
		}
	});

	it('timeout resolves the current value without throwOnTimeout', async () => {
		vi.useFakeTimers();
		const box = createBox(0);
		const { api: promise, dispose } = await mountUtil(() =>
			until(() => box.value).toBe(99, { timeout: 500 })
		);
		try {
			vi.advanceTimersByTime(500);
			await expect(promise).resolves.toBe(0);
		} finally {
			vi.useRealTimers();
			await dispose();
		}
	});

	it('timeout rejects with throwOnTimeout', async () => {
		vi.useFakeTimers();
		const box = createBox(0);
		const { api: promise, dispose } = await mountUtil(() =>
			until(() => box.value).toBe(99, { timeout: 500, throwOnTimeout: true })
		);
		try {
			vi.advanceTimersByTime(500);
			await expect(promise).rejects.toThrow('until() timed out after 500ms');
		} finally {
			vi.useRealTimers();
			await dispose();
		}
	});
});
