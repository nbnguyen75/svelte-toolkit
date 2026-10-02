// @vitest-environment jsdom
import { tick } from 'svelte';
import { describe, expect, it } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { useArrayEvery } from './index.ts';

describe('useArrayEvery', () => {
	it('is true when every element passes', () => {
		expect(useArrayEvery([2, 4, 6], (n) => n % 2 === 0).value).toBe(true);
	});

	it('is false when any element fails', () => {
		expect(useArrayEvery([2, 3], (n) => n % 2 === 0).value).toBe(false);
	});

	it('is true for an empty list', () => {
		expect(useArrayEvery([] as number[], () => false).value).toBe(true);
	});

	it('passes the element, index, and array', () => {
		const seen: string[] = [];
		const every = useArrayEvery(['a', 'b'], (element, index, array) => {
			seen.push(`${element}${index}${array.length}`);
			return true;
		});

		expect(every.value).toBe(true);
		expect(seen).toEqual(['a02', 'b12']);
	});

	it('short-circuits on the first failure', () => {
		let calls = 0;
		const every = useArrayEvery([1, 2, 3], (n) => {
			calls += 1;
			return n < 2;
		});

		expect(every.value).toBe(false);
		expect(calls).toBe(2);
	});

	it('tracks a reactive source', async () => {
		const box = createBox([2, 4]);
		const every = useArrayEvery(
			() => box.value,
			(n) => n % 2 === 0
		);

		expect(every.value).toBe(true);

		box.value = [2, 3];
		await tick();
		expect(every.value).toBe(false);
	});
});
