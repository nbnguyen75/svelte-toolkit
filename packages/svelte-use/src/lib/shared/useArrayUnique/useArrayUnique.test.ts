// @vitest-environment jsdom
import { tick } from 'svelte';
import { describe, expect, it } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { useArrayUnique } from './index.ts';

describe('useArrayUnique', () => {
	it('keeps the first occurrence of each value', () => {
		expect(useArrayUnique([1, 2, 1, 3, 2]).value).toEqual([1, 2, 3]);
	});

	it('uses Set semantics for the default comparison', () => {
		expect(useArrayUnique([1, 1, 2, 2, 3, 3]).value).toEqual([1, 2, 3]);
		expect(useArrayUnique(['a', 'a']).value).toEqual(['a']);
	});

	it('treats NaN as a duplicate of itself', () => {
		expect(useArrayUnique([Number.NaN, Number.NaN, 1]).value).toEqual([Number.NaN, 1]);
	});

	it('treats 0 and -0 as the same value, like Set', () => {
		expect(useArrayUnique([0, -0]).value).toEqual([0]);
	});

	it('compares object identity by default', () => {
		const a = { id: 1 };
		const b = { id: 1 };
		expect(useArrayUnique([a, b, a]).value).toEqual([a, b]);
	});

	it('accepts a custom comparator', () => {
		const rows = [
			{ id: 1, name: 'first' },
			{ id: 1, name: 'second' },
			{ id: 2, name: 'third' }
		];

		expect(useArrayUnique(rows, (a, b) => a.id === b.id).value).toEqual([
			{ id: 1, name: 'first' },
			{ id: 2, name: 'third' }
		]);
	});

	it('passes the source array to the comparator', () => {
		const source = [1, 1, 2];
		let seenLength = 0;

		useArrayUnique(source, (_a, _b, array) => {
			seenLength = array.length;
			return false;
		}).value;

		expect(seenLength).toBe(3);
	});

	it('tracks a reactive source', async () => {
		const box = createBox([1, 1, 2]);
		const unique = useArrayUnique(() => box.value);

		expect(unique.value).toEqual([1, 2]);

		box.value = [3, 3, 4, 3];
		await tick();
		expect(unique.value).toEqual([3, 4]);
	});

	it('handles an empty list', () => {
		expect(useArrayUnique([] as number[]).value).toEqual([]);
	});
});
