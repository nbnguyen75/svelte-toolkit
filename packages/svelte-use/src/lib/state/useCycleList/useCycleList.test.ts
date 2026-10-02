// @vitest-environment jsdom
import { tick } from 'svelte';
import { describe, expect, it } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountUtil } from '../../../../test/fixtures/mount.ts';
import { useCycleList } from './index.ts';

describe('useCycleList', () => {
	it('starts at the first item', async () => {
		const { api, dispose } = await mountUtil(() => useCycleList(['a', 'b', 'c']));
		try {
			expect(api.value).toBe('a');
			expect(api.index).toBe(0);
		} finally {
			await dispose();
		}
	});

	it('cycles forward and wraps around', async () => {
		const { api, dispose } = await mountUtil(() => useCycleList(['a', 'b', 'c']));
		try {
			expect(api.next()).toBe('b');
			expect(api.next()).toBe('c');
			expect(api.next()).toBe('a');
			expect(api.next(2)).toBe('c');
		} finally {
			await dispose();
		}
	});

	it('cycles backward and wraps around', async () => {
		const { api, dispose } = await mountUtil(() => useCycleList(['a', 'b', 'c']));
		try {
			expect(api.prev()).toBe('c');
			expect(api.prev()).toBe('b');
			expect(api.prev(2)).toBe('c');
		} finally {
			await dispose();
		}
	});

	it('wraps out-of-range indices in go', async () => {
		const { api, dispose } = await mountUtil(() => useCycleList(['a', 'b', 'c']));
		try {
			expect(api.go(1)).toBe('b');
			expect(api.go(3)).toBe('a');
			expect(api.go(-1)).toBe('c');
			expect(api.go(100)).toBe('b');
		} finally {
			await dispose();
		}
	});

	it('honours an initial value', async () => {
		const { api, dispose } = await mountUtil(() =>
			useCycleList(['a', 'b', 'c'], { initialValue: 'c' })
		);
		try {
			expect(api.value).toBe('c');
			expect(api.index).toBe(2);
			expect(api.next()).toBe('a');
		} finally {
			await dispose();
		}
	});

	it('uses fallbackIndex when the value is not in the list', async () => {
		const { api, dispose } = await mountUtil(() =>
			useCycleList(['a', 'b'], { initialValue: 'z', fallbackIndex: 1 })
		);
		try {
			expect(api.index).toBe(1);
			expect(api.next()).toBe('a');
		} finally {
			await dispose();
		}
	});

	it('uses a custom getIndexOf', async () => {
		const { api, dispose } = await mountUtil(() =>
			useCycleList([{ id: 1 }, { id: 2 }], {
				getIndexOf: (value, list) => list.findIndex((item) => item.id === value.id)
			})
		);
		try {
			expect(api.index).toBe(0);
			expect(api.next()).toEqual({ id: 2 });
		} finally {
			await dispose();
		}
	});

	it('reports -1 for an empty list and does not move', async () => {
		const { api, dispose } = await mountUtil(() => useCycleList<string[]>([]));
		try {
			expect(api.index).toBe(-1);
			expect(api.next()).toBeUndefined();
			expect(api.prev()).toBeUndefined();
		} finally {
			await dispose();
		}
	});

	it('writes through the value setter', async () => {
		const { api, dispose } = await mountUtil(() => useCycleList(['a', 'b', 'c']));
		try {
			api.value = 'c';
			expect(api.index).toBe(2);
		} finally {
			await dispose();
		}
	});

	it('re-anchors when a reactive list is replaced', async () => {
		const list = createBox(['a', 'b', 'c']);
		const { api, dispose } = await mountUtil(() => useCycleList(() => list.value));
		try {
			api.next(2);
			expect(api.value).toBe('c');

			list.value = ['x', 'y'];
			await tick();
			expect(api.value).toBe('x');
			expect(api.index).toBe(0);
		} finally {
			await dispose();
		}
	});

	it('keeps instances independent', async () => {
		const a = await mountUtil(() => useCycleList(['a', 'b']));
		const b = await mountUtil(() => useCycleList(['a', 'b']));
		try {
			a.api.next();
			expect(a.api.value).toBe('b');
			expect(b.api.value).toBe('a');
		} finally {
			await a.dispose();
			await b.dispose();
		}
	});
});
