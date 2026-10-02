// @vitest-environment jsdom
import { tick } from 'svelte';
import { describe, expect, it } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { useArrayMap } from './index.ts';

describe('useArrayMap', () => {
	it('maps a plain array', () => {
		expect(useArrayMap([1, 2, 3], (n) => n * 2).value).toEqual([2, 4, 6]);
	});

	it('passes the element, index, and array', () => {
		const seen: string[] = [];
		const mapped = useArrayMap(['a', 'b'], (element, index, array) => {
			seen.push(`${element}${index}${array.length}`);
			return element;
		});

		// Lazy: the callback runs on read, not at construction.
		expect(seen).toEqual([]);
		expect(mapped.value).toEqual(['a', 'b']);
		expect(seen).toEqual(['a02', 'b12']);
	});

	it('returns a new array and leaves the source untouched', () => {
		const source = [1, 2];
		const mapped = useArrayMap(source, (n) => n + 1);

		expect(mapped.value).toEqual([2, 3]);
		expect(mapped.value).not.toBe(source);
		expect(source).toEqual([1, 2]);
	});

	it('tracks a reactive source', async () => {
		const box = createBox([1, 2]);
		const mapped = useArrayMap(
			() => box.value,
			(n) => n * 10
		);

		expect(mapped.value).toEqual([10, 20]);

		box.value = [3, 4, 5];
		await tick();
		expect(mapped.value).toEqual([30, 40, 50]);
	});

	it('handles an empty list', () => {
		expect(useArrayMap([] as number[], (n) => n).value).toEqual([]);
	});

	it('can change the element type', () => {
		const lengths = useArrayMap(['ab', 'cde'], (s) => s.length);

		expect(lengths.value).toEqual([2, 3]);
	});
});
