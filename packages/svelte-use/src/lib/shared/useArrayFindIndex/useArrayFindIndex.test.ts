// @vitest-environment jsdom
import { tick } from 'svelte';
import { describe, expect, it } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { useArrayFindIndex } from './index.ts';

describe('useArrayFindIndex', () => {
	it('returns the index of the first match', () => {
		expect(useArrayFindIndex([1, 3, 4], (n) => n % 2 === 0).value).toBe(2);
	});

	it('returns -1 when nothing matches', () => {
		expect(useArrayFindIndex([1, 3], (n) => n % 2 === 0).value).toBe(-1);
	});

	it('returns -1 for an empty list', () => {
		expect(useArrayFindIndex([] as number[], () => true).value).toBe(-1);
	});

	it('passes the element, index, and array', () => {
		const seen: string[] = [];
		const found = useArrayFindIndex(['a', 'b'], (element, index, array) => {
			seen.push(`${element}${index}${array.length}`);
			return false;
		});

		expect(found.value).toBe(-1);
		expect(seen).toEqual(['a02', 'b12']);
	});

	it('short-circuits on the first match', () => {
		let calls = 0;
		const found = useArrayFindIndex([1, 2, 3], (n) => {
			calls += 1;
			return n === 2;
		});

		expect(found.value).toBe(1);
		expect(calls).toBe(2);
	});

	it('tracks a reactive source', async () => {
		const box = createBox([1, 2]);
		const found = useArrayFindIndex(
			() => box.value,
			(n) => n > 1
		);

		expect(found.value).toBe(1);

		box.value = [5, 6, 7];
		await tick();
		expect(found.value).toBe(0);
	});
});
