// @vitest-environment jsdom
import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountUtil } from '../../../../test/fixtures/mount.ts';
import { useCloned } from './index.ts';

describe('useCloned', () => {
	it('clones the source with structuredClone by default', async () => {
		const source = createBox({ a: 1 });
		const { api, dispose } = await mountUtil(() => useCloned(() => source.value));
		try {
			expect(api.value).toEqual({ a: 1 });
			expect(api.value).not.toBe(source.value);
		} finally {
			await dispose();
		}
	});

	it('detects an edit and clears it on sync', async () => {
		const source = createBox({ a: 1 });
		const { api, dispose } = await mountUtil(() => useCloned(() => source.value));
		try {
			expect(api.isModified).toBe(false);

			api.value.a = 2;
			await tick();
			expect(api.isModified).toBe(true);

			api.sync();
			expect(api.isModified).toBe(false);
			expect(api.value).toEqual({ a: 1 });
		} finally {
			await dispose();
		}
	});

	it('does not mutate the source when the clone is edited', async () => {
		const source = createBox({ a: 1 });
		const { api, dispose } = await mountUtil(() => useCloned(() => source.value));
		try {
			api.value.a = 99;
			await tick();
			expect(source.value.a).toBe(1);
		} finally {
			await dispose();
		}
	});

	it('re-syncs automatically when the source changes', async () => {
		const source = createBox({ a: 1 });
		const { api, dispose } = await mountUtil(() => useCloned(() => source.value));
		try {
			api.value.a = 2;
			await tick();
			expect(api.isModified).toBe(true);

			source.value = { a: 3 };
			await tick();
			expect(api.value).toEqual({ a: 3 });
			expect(api.isModified).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('ignores source changes in manual mode', async () => {
		const source = createBox({ a: 1 });
		const { api, dispose } = await mountUtil(() => useCloned(() => source.value, { manual: true }));
		try {
			source.value = { a: 5 };
			await tick();
			expect(api.value).toEqual({ a: 1 });

			api.sync();
			expect(api.value).toEqual({ a: 5 });
		} finally {
			await dispose();
		}
	});

	it('uses a custom clone implementation', async () => {
		const clone = vi.fn((source: { a: number }) => ({ a: source.a + 1 }));
		const source = createBox({ a: 1 });
		const { api, dispose } = await mountUtil(() => useCloned(() => source.value, { clone }));
		try {
			expect(clone).toHaveBeenCalled();
			expect(api.value).toEqual({ a: 2 });
		} finally {
			await dispose();
		}
	});

	it('accepts a plain value source', async () => {
		const { api, dispose } = await mountUtil(() => useCloned({ a: 1 }));
		try {
			expect(api.value).toEqual({ a: 1 });
		} finally {
			await dispose();
		}
	});

	it('supports primitive sources', async () => {
		const { api, dispose } = await mountUtil(() => useCloned(7));
		try {
			expect(api.value).toBe(7);
		} finally {
			await dispose();
		}
	});

	it('supports array sources', async () => {
		const source = createBox([1, 2, 3]);
		const { api, dispose } = await mountUtil(() => useCloned(() => source.value));
		try {
			expect(api.value).toEqual([1, 2, 3]);
			api.value.push(4);
			await tick();
			expect(api.isModified).toBe(true);
			expect(source.value).toEqual([1, 2, 3]);
		} finally {
			await dispose();
		}
	});
});
