// @vitest-environment jsdom
import { tick } from 'svelte';
import { describe, expect, it } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { useArrayIncludes } from './index.ts';

interface User {
	id: number;
	name: string;
}

const users: User[] = [
	{ id: 1, name: 'ada' },
	{ id: 2, name: 'bob' }
];

describe('useArrayIncludes', () => {
	it('finds a present value', () => {
		expect(useArrayIncludes([1, 2, 3], 2).value).toBe(true);
	});

	it('reports a missing value', () => {
		expect(useArrayIncludes([1, 2, 3], 9).value).toBe(false);
	});

	it('is false for an empty list', () => {
		expect(useArrayIncludes([] as number[], 1).value).toBe(false);
	});

	it('matches NaN the way native includes does', () => {
		expect(useArrayIncludes([Number.NaN, 1], Number.NaN).value).toBe(true);
	});

	it('treats 0 and -0 as the same value', () => {
		expect(useArrayIncludes([0], -0).value).toBe(true);
	});

	it('accepts a getter for the list and for the value', async () => {
		const box = createBox([1, 2, 3]);
		const needle = createBox(2);
		const known = useArrayIncludes(
			() => box.value,
			() => needle.value
		);

		expect(known.value).toBe(true);

		needle.value = 9;
		await tick();
		expect(known.value).toBe(false);
	});

	it('compares by reference without a comparator', () => {
		expect(useArrayIncludes(users, users[0]).value).toBe(true);
		expect(useArrayIncludes(users, { id: 1, name: 'ada' }).value).toBe(false);
	});

	it('accepts a comparator function', () => {
		const byName = useArrayIncludes(users, 'bob', (user, name) => user.name === name);

		expect(byName.value).toBe(true);
		expect(useArrayIncludes(users, 'zed', (user, name) => user.name === name).value).toBe(false);
	});

	it('passes the element, index, and array to the comparator', () => {
		const seen: string[] = [];
		const found = useArrayIncludes(['a', 'b'], 'x', (element, value, index, array) => {
			seen.push(`${element}${value}${index}${array.length}`);
			return false;
		});

		expect(found.value).toBe(false);
		expect(seen).toEqual(['ax02', 'bx12']);
	});

	it('accepts an element key', () => {
		expect(useArrayIncludes(users, 2, 'id').value).toBe(true);
		expect(useArrayIncludes(users, 9, 'id').value).toBe(false);
	});

	it('accepts a string key', () => {
		expect(useArrayIncludes(users, 'ada', 'name').value).toBe(true);
		expect(useArrayIncludes(users, 'zed', 'name').value).toBe(false);
	});

	it('accepts fromIndex in an options object', () => {
		expect(useArrayIncludes([1, 2, 3], 1, { fromIndex: 1 }).value).toBe(false);
		expect(useArrayIncludes([1, 2, 3], 1, { fromIndex: 0 }).value).toBe(true);
		expect(useArrayIncludes([1, 2, 1], 1, { fromIndex: 2 }).value).toBe(true);
		expect(useArrayIncludes([1, 2, 3], 1, { fromIndex: 99 }).value).toBe(false);
	});

	it('accepts a comparator in an options object', () => {
		const options = { comparator: (user: User, name: string) => user.name === name };

		expect(useArrayIncludes(users, 'bob', options).value).toBe(true);
		expect(useArrayIncludes(users, 'zed', options).value).toBe(false);
	});

	it('accepts a key in an options object', () => {
		expect(useArrayIncludes(users, 1, { comparator: 'id' }).value).toBe(true);
		expect(useArrayIncludes(users, 8, { comparator: 'id' }).value).toBe(false);
	});

	it('combines fromIndex and a comparator', () => {
		const options = {
			comparator: (user: User, name: string) => user.name === name,
			fromIndex: 2
		};

		expect(useArrayIncludes(users, 'ada', options).value).toBe(false);
	});

	it('falls back to strict equality for an empty options object', () => {
		expect(useArrayIncludes([1, 2], 2, {}).value).toBe(true);
		expect(useArrayIncludes([1, 2], 3, {}).value).toBe(false);
	});

	it('tracks a reactive source', async () => {
		const box = createBox([1, 2]);
		const known = useArrayIncludes(() => box.value, 3);

		expect(known.value).toBe(false);

		box.value = [1, 2, 3];
		await tick();
		expect(known.value).toBe(true);
	});
});
