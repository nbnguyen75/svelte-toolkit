// @vitest-environment jsdom
import { tick } from 'svelte';
import { describe, expect, it } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountUtil } from '../../../../test/fixtures/mount.ts';
import { usePrevious } from './index.ts';

describe('usePrevious', () => {
	it('returns the initial value before any change', async () => {
		const box = createBox(1);
		const { api, dispose } = await mountUtil(() => usePrevious(() => box.value));
		try {
			expect(api()).toBeUndefined();
		} finally {
			await dispose();
		}
	});

	it('exposes the provided initial value', async () => {
		const box = createBox(1);
		const { api, dispose } = await mountUtil(() => usePrevious(() => box.value, 0));
		try {
			expect(api()).toBe(0);
		} finally {
			await dispose();
		}
	});

	it('tracks the value from before the latest change', async () => {
		const box = createBox(1);
		const { api, dispose } = await mountUtil(() => usePrevious(() => box.value));
		try {
			box.value = 2;
			await tick();
			expect(api()).toBe(1);

			box.value = 3;
			await tick();
			expect(api()).toBe(2);
		} finally {
			await dispose();
		}
	});

	it('accepts a getter source', async () => {
		const box = createBox('a');
		const { api, dispose } = await mountUtil(() => usePrevious(() => box.value));
		try {
			box.value = 'b';
			await tick();
			expect(api()).toBe('a');
		} finally {
			await dispose();
		}
	});

	it('does not move when the value is set to the same value', async () => {
		const box = createBox(1);
		const { api, dispose } = await mountUtil(() => usePrevious(() => box.value, 'seed'));
		try {
			box.value = 1;
			await tick();
			expect(api()).toBe('seed');

			box.value = 2;
			await tick();
			expect(api()).toBe(1);
		} finally {
			await dispose();
		}
	});

	it('keeps instances independent', async () => {
		const first = createBox(1);
		const second = createBox(10);
		const a = await mountUtil(() => usePrevious(() => first.value));
		const b = await mountUtil(() => usePrevious(() => second.value));
		try {
			first.value = 2;
			await tick();
			expect(a.api()).toBe(1);
			expect(b.api()).toBeUndefined();
		} finally {
			await a.dispose();
			await b.dispose();
		}
	});
});
