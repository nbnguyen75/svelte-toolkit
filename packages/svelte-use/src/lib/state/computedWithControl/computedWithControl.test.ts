// @vitest-environment jsdom
import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountUtil } from '../../../../test/fixtures/mount.ts';
import { computedWithControl } from './index.ts';

describe('computedWithControl', () => {
	it('computes once and caches between reads', async () => {
		const box = createBox(2);
		const spy = vi.fn(() => box.value * 10);
		const { api, dispose } = await mountUtil(() => computedWithControl(() => box.value, spy));
		try {
			expect(api.value).toBe(20);
			expect(api.value).toBe(20);
			expect(spy).toHaveBeenCalledTimes(1);
		} finally {
			await dispose();
		}
	});

	it('recomputes when the source changes', async () => {
		const box = createBox(2);
		const spy = vi.fn(() => box.value * 10);
		const { api, dispose } = await mountUtil(() => computedWithControl(() => box.value, spy));
		try {
			expect(api.value).toBe(20);
			box.value = 3;
			await tick();
			expect(api.value).toBe(30);
			expect(spy).toHaveBeenCalledTimes(2);
		} finally {
			await dispose();
		}
	});

	it('trigger forces a recomputation', async () => {
		const box = createBox(1);
		let calls = 0;
		const { api, dispose } = await mountUtil(() =>
			computedWithControl(
				() => box.value,
				() => {
					calls += 1;
					return 'value';
				}
			)
		);
		try {
			expect(api.value).toBe('value');
			expect(calls).toBe(1);
			api.trigger();
			expect(api.value).toBe('value');
			expect(calls).toBe(2);
		} finally {
			await dispose();
		}
	});

	it('does not track reads made inside fn', async () => {
		const source = createBox(0);
		const inner = createBox('a');
		const spy = vi.fn(() => inner.value);
		const { api, dispose } = await mountUtil(() => computedWithControl(() => source.value, spy));
		try {
			expect(api.value).toBe('a');
			inner.value = 'b';
			await tick();
			expect(api.value).toBe('a');
			expect(spy).toHaveBeenCalledTimes(1);
		} finally {
			await dispose();
		}
	});

	it('caches an undefined result once', async () => {
		const box = createBox(0);
		const spy = vi.fn(() => undefined);
		const { api, dispose } = await mountUtil(() => computedWithControl(() => box.value, spy));
		try {
			expect(api.value).toBeUndefined();
			expect(api.value).toBeUndefined();
			expect(spy).toHaveBeenCalledTimes(1);
		} finally {
			await dispose();
		}
	});

	it('routes writes through the setter on the writable overload', async () => {
		const box = createBox(0);
		let stored = 7;
		const set = vi.fn((value: number) => {
			stored = value;
		});
		const { api, dispose } = await mountUtil(() =>
			computedWithControl(() => box.value, { get: () => stored, set })
		);
		try {
			expect(api.value).toBe(7);
			api.value = 42;
			expect(set).toHaveBeenCalledWith(42);
			expect(stored).toBe(42);
		} finally {
			await dispose();
		}
	});
});
