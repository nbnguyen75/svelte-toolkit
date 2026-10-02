// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { useArrayReduce } from './index.ts';

describe('useArrayReduce', () => {
	it('reduces without an initial value', () => {
		expect(useArrayReduce([1, 2, 3, 4], (sum, n) => sum + n).value).toBe(10);
	});

	it('reduces with an initial value', () => {
		expect(useArrayReduce([1, 2, 3], (sum, n) => sum + n, 100).value).toBe(106);
	});

	it('reduces into a different type', () => {
		const result = useArrayReduce([1, 2, 3], (acc: string, n) => `${acc}${n}`, '');

		expect(result.value).toBe('123');
	});

	it('reduces into an object accumulator', () => {
		const lines = [{ total: 10 }, { total: 20 }];
		const totals = useArrayReduce(lines, (acc, line) => ({ sum: acc.sum + line.total }), {
			sum: 0
		});

		expect(totals.value).toEqual({ sum: 30 });
	});

	it('resolves a getter initial value', () => {
		const box = createBox(10);
		const reduced = useArrayReduce(
			[1, 2],
			(sum, n) => sum + n,
			() => box.value
		);

		expect(reduced.value).toBe(13);
		box.value = 100;
		expect(reduced.value).toBe(103);
	});

	it('starts the index at 1 without an initial value', () => {
		const indices: number[] = [];
		const total = useArrayReduce([5, 6], (sum, n, index) => {
			indices.push(index);
			return sum + n;
		}).value;

		expect(total).toBe(11);
		expect(indices).toEqual([1]);
	});

	it('starts the index at 0 with an initial value', () => {
		const indices: number[] = [];
		useArrayReduce(
			[5, 6],
			(sum, n, index) => {
				indices.push(index);
				return sum + n;
			},
			0
		).value;

		expect(indices).toEqual([0, 1]);
	});

	it('throws on an empty list without an initial value', () => {
		expect(() => useArrayReduce([], (sum: number, n: number) => sum + n).value).toThrow(TypeError);
	});

	it('returns the initial value for an empty list with one', () => {
		expect(useArrayReduce([], (sum: number, n: number) => sum + n, 7).value).toBe(7);
	});

	it('returns the single element without an initial value', () => {
		expect(useArrayReduce([42], (sum, n) => sum + n).value).toBe(42);
	});

	it('tracks a reactive source', () => {
		const box = createBox([1, 2]);
		const reduced = useArrayReduce(
			() => box.value,
			(sum, n) => sum + n,
			0
		);

		expect(reduced.value).toBe(3);
		box.value = [1, 2, 3];
		expect(reduced.value).toBe(6);
	});

	it('treats a zero initial value as provided', () => {
		expect(useArrayReduce([1, 2], (sum, n) => sum + n, 0).value).toBe(3);
	});
});
