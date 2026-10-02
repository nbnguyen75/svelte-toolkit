// @vitest-environment jsdom
import { tick } from 'svelte';
import { describe, expect, it } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { useArrayFindLast } from './index.ts';

describe('useArrayFindLast', () => {
	it('returns the last matching element', () => {
		expect(useArrayFindLast([2, 1, 4], (n) => n % 2 === 0).value).toBe(4);
	});

	it('returns undefined when nothing matches', () => {
		expect(useArrayFindLast([1, 3], (n) => n % 2 === 0).value).toBeUndefined();
	});

	it('returns undefined for an empty list', () => {
		expect(useArrayFindLast([] as number[], () => true).value).toBeUndefined();
	});

	it('scans from the end and passes the real index', () => {
		const seen: string[] = [];
		const found = useArrayFindLast(['a', 'b', 'c'], (element, index, array) => {
			seen.push(`${element}${index}${array.length}`);
			return element === 'a';
		});

		expect(found.value).toBe('a');
		expect(seen).toEqual(['c23', 'b13', 'a03']);
	});

	it('short-circuits on the first match from the end', () => {
		let calls = 0;
		const found = useArrayFindLast([1, 2, 3], (n) => {
			calls += 1;
			return n === 2;
		});

		expect(found.value).toBe(2);
		expect(calls).toBe(2);
	});

	it('keeps reference identity of the found element', () => {
		const a = { id: 1 };
		const b = { id: 2 };

		expect(useArrayFindLast([a, b], (item) => item.id === 1).value).toBe(a);
	});

	it('tracks a reactive source', async () => {
		const box = createBox([1, 2, 3]);
		const found = useArrayFindLast(
			() => box.value,
			(n) => n % 2 === 1
		);

		expect(found.value).toBe(3);

		box.value = [8, 9, 10];
		await tick();
		expect(found.value).toBe(9);
	});
});
