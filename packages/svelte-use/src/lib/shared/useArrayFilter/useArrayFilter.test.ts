// @vitest-environment jsdom
import { tick } from 'svelte';
import { describe, expect, it } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { useArrayFilter } from './index.ts';

describe('useArrayFilter', () => {
	it('keeps elements passing the predicate', () => {
		expect(useArrayFilter([1, 2, 3, 4], (n) => n % 2 === 0).value).toEqual([2, 4]);
	});

	it('passes the element, index, and array', () => {
		const seen: string[] = [];
		const filtered = useArrayFilter(['a', 'b'], (element, index, array) => {
			seen.push(`${element}${index}${array.length}`);
			return element === 'b';
		});

		expect(filtered.value).toEqual(['b']);
		expect(seen).toEqual(['a02', 'b12']);
	});

	it('leaves the source untouched', () => {
		const source = [1, 2, 3];
		const filtered = useArrayFilter(source, (n) => n > 1);

		expect(filtered.value).toEqual([2, 3]);
		expect(source).toEqual([1, 2, 3]);
		expect(filtered.value).not.toBe(source);
	});

	it('tracks a reactive source', async () => {
		const box = createBox([1, 2, 3]);
		const filtered = useArrayFilter(
			() => box.value,
			(n) => n % 2 === 1
		);

		expect(filtered.value).toEqual([1, 3]);

		box.value = [4, 5];
		await tick();
		expect(filtered.value).toEqual([5]);
	});

	it('handles an empty list and a no-match list', () => {
		expect(useArrayFilter([] as number[], () => true).value).toEqual([]);
		expect(useArrayFilter([1, 2], () => false).value).toEqual([]);
	});
});
