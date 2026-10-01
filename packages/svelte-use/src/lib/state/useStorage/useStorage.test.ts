// @vitest-environment jsdom
import { tick } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mountUtil } from '../../../../test/fixtures/mount.ts';
import type { UseStorageReturn } from './index.ts';
import { useLocalStorage, useSessionStorage } from './index.ts';

beforeEach(() => {
	window.localStorage.clear();
	window.sessionStorage.clear();
});

const mountCell = <T>(create: () => UseStorageReturn<T>) => mountUtil(create);

describe('useStorage', () => {
	it('returns the default for a missing key and persists write-through', async () => {
		const { api, dispose } = await mountCell(() => useLocalStorage('su-missing', 42));
		try {
			expect(api.value).toBe(42);
			api.value = 7;
			await tick();
			expect(window.localStorage.getItem('su-missing')).toBe('7');
		} finally {
			await dispose();
		}
	});

	it('reads a previously stored JSON value', async () => {
		window.localStorage.setItem('su-exists', '{"a":1}');
		const { api, dispose } = await mountCell(() =>
			useLocalStorage<{ a: number }>('su-exists', { a: 0 })
		);
		try {
			expect(api.value).toEqual({ a: 1 });
		} finally {
			await dispose();
		}
	});

	it('passes plain strings through without JSON quoting', async () => {
		window.localStorage.setItem('su-raw', 'plain');
		const { api, dispose } = await mountCell(() => useLocalStorage('su-raw', 'fallback'));
		try {
			expect(api.value).toBe('plain');
			api.value = 'updated';
			await tick();
			expect(window.localStorage.getItem('su-raw')).toBe('updated');
		} finally {
			await dispose();
		}
	});

	it('round-trips objects and restores them on remount', async () => {
		const first = await mountCell(() => useLocalStorage('su-obj', { items: [] as string[] }));
		first.api.value = { items: ['a', 'b'] };
		await tick();
		await first.dispose();
		const second = await mountCell(() => useLocalStorage('su-obj', { items: [] as string[] }));
		try {
			expect(second.api.value).toEqual({ items: ['a', 'b'] });
		} finally {
			await second.dispose();
		}
	});

	it('honors a custom serializer', async () => {
		const hex = {
			read: (raw: string) => Number.parseInt(raw, 16),
			write: (value: number) => value.toString(16)
		};
		const { api, dispose } = await mountCell(() => useLocalStorage('su-hex', 0, hex));
		try {
			api.value = 255;
			await tick();
			expect(window.localStorage.getItem('su-hex')).toBe('ff');
			expect(api.value).toBe(255);
		} finally {
			await dispose();
		}
	});

	it('falls back to the default when the serializer throws', async () => {
		window.localStorage.setItem('su-bad', '###');
		const throwing = {
			read: (_raw: string): number => {
				throw new Error('cannot parse');
			},
			write: (value: number) => String(value)
		};
		const { api, dispose } = await mountCell(() => useLocalStorage('su-bad', 9, throwing));
		try {
			expect(api.value).toBe(9);
		} finally {
			await dispose();
		}
	});

	it('falls back to the default when storage access throws', async () => {
		const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('denied');
		});
		const { api, dispose } = await mountCell(() => useLocalStorage('su-deny', 'safe'));
		try {
			expect(api.value).toBe('safe');
		} finally {
			await dispose();
		}
		expect(getItem).toHaveBeenCalled();
	});

	it('survives write failures and keeps the in-memory value', async () => {
		const { api, dispose } = await mountCell(() => useLocalStorage('su-full', 'a'));
		const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('full');
		});
		try {
			api.value = 'b';
			await tick();
			expect(api.value).toBe('b');
		} finally {
			await dispose();
		}
		expect(setItem).toHaveBeenCalled();
	});

	it('syncs across instances via storage events', async () => {
		const first = await mountCell(() => useLocalStorage('su-sync', 'one'));
		const second = await mountCell(() => useLocalStorage('su-sync', 'one'));
		try {
			window.dispatchEvent(new StorageEvent('storage', { key: 'su-sync', newValue: '"two"' }));
			await tick();
			expect(first.api.value).toBe('two');
			expect(second.api.value).toBe('two');
			// Unrelated keys are ignored.
			window.dispatchEvent(new StorageEvent('storage', { key: 'other', newValue: '"x"' }));
			await tick();
			expect(first.api.value).toBe('two');
		} finally {
			await first.dispose();
			await second.dispose();
		}
	});

	it('keeps the current value when a cross-tab payload cannot be decoded', async () => {
		const throwing = {
			read: (_raw: string): number => {
				throw new Error('cannot parse');
			},
			write: (value: number) => String(value)
		};
		const { api, dispose } = await mountCell(() => useLocalStorage('su-corrupt', 1, throwing));
		try {
			expect(api.value).toBe(1);
			window.dispatchEvent(new StorageEvent('storage', { key: 'su-corrupt', newValue: 'garbage' }));
			await tick();
			expect(api.value).toBe(1);
		} finally {
			await dispose();
		}
	});

	it('rejects a stored payload whose shape does not match the default', async () => {
		// A string payload for a number cell, an object for an array cell, and a
		// wrong field type: none can be proven to be `T`, so the default wins.
		window.localStorage.setItem('su-shape-num', '"not a number"');
		window.localStorage.setItem('su-shape-arr', '{"0":"a"}');
		window.localStorage.setItem('su-shape-obj', '{"a":"not a number"}');
		window.localStorage.setItem('su-shape-nested', '{"a":{"b":1}}');

		const num = await mountCell(() => useLocalStorage('su-shape-num', 0));
		const arr = await mountCell(() => useLocalStorage('su-shape-arr', [] as string[]));
		const obj = await mountCell(() => useLocalStorage('su-shape-obj', { a: 0 }));
		const nested = await mountCell(() => useLocalStorage('su-shape-nested', { a: { b: 1 } }));
		try {
			expect(num.api.value).toBe(0);
			expect(arr.api.value).toEqual([]);
			expect(obj.api.value).toEqual({ a: 0 });
			// A matching nested shape is accepted.
			expect(nested.api.value).toEqual({ a: { b: 1 } });
		} finally {
			await num.dispose();
			await arr.dispose();
			await obj.dispose();
			await nested.dispose();
		}
	});

	it('constrains array elements only when the default is non-empty', async () => {
		// Distinct keys: each cell writes through, so sharing one would let a
		// rejecting cell overwrite the payload the next cell is meant to read.
		window.localStorage.setItem('su-shape-list', '["a","b"]');
		window.localStorage.setItem('su-shape-bad-list', '[1,"b"]');
		window.localStorage.setItem('su-shape-empty-list', '[1,"b"]');

		// A non-empty default carries element-type information.
		const seeded = await mountCell(() => useLocalStorage('su-shape-list', ['x'] as string[]));
		const badList = await mountCell(() => useLocalStorage('su-shape-bad-list', ['x'] as string[]));
		// An empty default carries none, so any array is accepted.
		const empty = await mountCell(() => useLocalStorage('su-shape-empty-list', [] as string[]));

		try {
			expect(seeded.api.value).toEqual(['a', 'b']);
			expect(badList.api.value).toEqual(['x']);
			expect(empty.api.value).toEqual([1, 'b']);
		} finally {
			await seeded.dispose();
			await badList.dispose();
			await empty.dispose();
		}
	});

	it('useSessionStorage isolates from localStorage', async () => {
		const { api, dispose } = await mountCell(() => useSessionStorage('su-sess', 's'));
		try {
			api.value = 'updated';
			await tick();
			expect(window.sessionStorage.getItem('su-sess')).toBe('updated');
			expect(window.localStorage.getItem('su-sess')).toBeNull();
		} finally {
			await dispose();
		}
	});
});
