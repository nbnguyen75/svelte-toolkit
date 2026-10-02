// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { useArrayDifference } from './index.ts';

interface Row {
	id: number;
	label: string;
}

const rows: Row[] = [
	{ id: 1, label: 'a' },
	{ id: 2, label: 'b' }
];

describe('useArrayDifference', () => {
	it('keeps items missing from the second array', () => {
		expect(useArrayDifference([1, 2, 3], [2]).value).toEqual([1, 3]);
	});

	it('is empty when every item is present', () => {
		expect(useArrayDifference([1, 2], [1, 2]).value).toEqual([]);
	});

	it('keeps the whole list when the second array is empty', () => {
		expect(useArrayDifference([1, 2], []).value).toEqual([1, 2]);
	});

	it('is empty for an empty list', () => {
		expect(useArrayDifference([], [1, 2]).value).toEqual([]);
	});

	it('is empty when both are empty', () => {
		expect(useArrayDifference([], []).value).toEqual([]);
	});

	it('preserves order and removes every duplicate occurrence', () => {
		expect(useArrayDifference([3, 1, 3, 2], [3]).value).toEqual([1, 2]);
	});

	it('compares object identity by default', () => {
		expect(useArrayDifference(rows, [rows[0]]).value).toEqual([rows[1]]);
	});

	it('compares by key', () => {
		expect(useArrayDifference(rows, [{ id: 1, label: 'other' }], 'id').value).toEqual([
			{ id: 2, label: 'b' }
		]);
	});

	it('reports every row missing by key', () => {
		expect(useArrayDifference(rows, [], 'id').value).toEqual(rows);
	});

	it('accepts a string key', () => {
		expect(useArrayDifference(rows, [{ id: 9, label: 'a' }], 'label').value).toEqual([rows[1]]);
	});

	it('accepts a comparator function', () => {
		const byId = (a: Row, b: Row) => a.id === b.id;

		expect(useArrayDifference(rows, [{ id: 2, label: 'other' }], byId).value).toEqual([rows[0]]);
	});

	it('includes the reverse difference when symmetric', () => {
		expect(useArrayDifference([1, 2], [2, 3], undefined, { symmetric: true }).value).toEqual([
			1, 3
		]);
	});

	it('is asymmetric by default', () => {
		expect(useArrayDifference([1, 2], [2, 3]).value).toEqual([1]);
	});

	it('lists both sides when nothing overlaps and symmetric', () => {
		expect(useArrayDifference([1, 2], [3, 4], undefined, { symmetric: true }).value).toEqual([
			1, 2, 3, 4
		]);
	});

	it('combines a key with the symmetric option', () => {
		const other = [{ id: 2, label: 'other' }];

		expect(useArrayDifference(rows, other, 'id', { symmetric: true }).value).toEqual([rows[0]]);
	});

	it('combines a comparator with the symmetric option', () => {
		const byId = (a: Row, b: Row) => a.id === b.id;
		const other = [{ id: 2, label: 'other' }];

		expect(useArrayDifference(rows, other, byId, { symmetric: true }).value).toEqual([rows[0]]);
	});

	it('tracks a reactive list', () => {
		const box = createBox([1, 2, 3]);
		const difference = useArrayDifference(() => box.value, [2]);

		expect(difference.value).toEqual([1, 3]);

		box.value = [2, 3];
		expect(difference.value).toEqual([3]);
	});

	it('tracks a reactive second array', () => {
		const box = createBox([2]);
		const difference = useArrayDifference([1, 2, 3], () => box.value);

		expect(difference.value).toEqual([1, 3]);

		box.value = [1, 3];
		expect(difference.value).toEqual([2]);
	});
});
