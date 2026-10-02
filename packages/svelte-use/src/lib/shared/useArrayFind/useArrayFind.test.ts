// @vitest-environment jsdom
import { tick } from 'svelte';
import { describe, expect, it } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { useArrayFind } from './index.ts';

describe('useArrayFind', () => {
	it('returns the first matching element', () => {
		expect(useArrayFind([1, 2, 3], (n) => n > 1).value).toBe(2);
	});

	it('returns undefined when nothing matches', () => {
		expect(useArrayFind([1, 2], (n) => n > 5).value).toBeUndefined();
	});

	it('returns undefined for an empty list', () => {
		expect(useArrayFind([] as number[], () => true).value).toBeUndefined();
	});

	it('passes the element, index, and array', () => {
		const seen: string[] = [];
		const found = useArrayFind(['a', 'b'], (element, index, array) => {
			seen.push(`${element}${index}${array.length}`);
			return element === 'b';
		});

		expect(found.value).toBe('b');
		expect(seen).toEqual(['a02', 'b12']);
	});

	it('short-circuits on the first match', () => {
		let calls = 0;
		const found = useArrayFind([1, 2, 3], (n) => {
			calls += 1;
			return n === 2;
		});

		expect(found.value).toBe(2);
		expect(calls).toBe(2);
	});

	it('keeps reference identity of the found element', () => {
		const a = { id: 1 };
		const b = { id: 2 };

		expect(useArrayFind([a, b], (item) => item.id === 2).value).toBe(b);
	});

	it('tracks a reactive source', async () => {
		const box = createBox([1, 2, 3]);
		const found = useArrayFind(
			() => box.value,
			(n) => n > 1
		);

		expect(found.value).toBe(2);

		box.value = [7, 8];
		await tick();
		expect(found.value).toBe(7);
	});
});
