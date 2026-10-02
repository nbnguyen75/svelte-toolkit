// @vitest-environment jsdom
import { tick } from 'svelte';
import { describe, expect, it } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { useArraySome } from './index.ts';

describe('useArraySome', () => {
	it('is true when any element passes', () => {
		expect(useArraySome([1, 2, 3], (n) => n > 2).value).toBe(true);
	});

	it('is false when no element passes', () => {
		expect(useArraySome([1, 2], (n) => n > 5).value).toBe(false);
	});

	it('is false for an empty list', () => {
		expect(useArraySome([] as number[], () => true).value).toBe(false);
	});

	it('passes the element, index, and array', () => {
		const seen: string[] = [];
		const some = useArraySome(['a', 'b'], (element, index, array) => {
			seen.push(`${element}${index}${array.length}`);
			return false;
		});

		expect(some.value).toBe(false);
		expect(seen).toEqual(['a02', 'b12']);
	});

	it('short-circuits on the first match', () => {
		let calls = 0;
		const some = useArraySome([1, 2, 3], (n) => {
			calls += 1;
			return n === 2;
		});

		expect(some.value).toBe(true);
		expect(calls).toBe(2);
	});

	it('tracks a reactive source', async () => {
		const box = createBox([1, 2]);
		const some = useArraySome(
			() => box.value,
			(n) => n > 5
		);

		expect(some.value).toBe(false);

		box.value = [1, 9];
		await tick();
		expect(some.value).toBe(true);
	});
});
