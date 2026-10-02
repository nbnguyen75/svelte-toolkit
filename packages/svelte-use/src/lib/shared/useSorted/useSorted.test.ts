// @vitest-environment jsdom
import { tick } from 'svelte';
import { describe, expect, it } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountSetup } from '../../../../test/fixtures/mount.ts';
import { useSorted } from './index.ts';

describe('useSorted copy mode', () => {
	it('sorts numbers ascending by default', () => {
		expect(useSorted([3, 1, 2]).value).toEqual([1, 2, 3]);
	});

	it('does not mutate the source', () => {
		const source = [3, 1, 2];

		expect(useSorted(source).value).toEqual([1, 2, 3]);
		expect(source).toEqual([3, 1, 2]);
	});

	it('returns a new array, not the source', () => {
		const source = [3, 1, 2];
		const sorted = useSorted(source);

		expect(sorted.value).not.toBe(source);
	});

	it('applies ToNumber coercion, so numeric strings sort numerically', () => {
		expect(useSorted(['10', '9', '2']).value).toEqual(['2', '9', '10']);
	});

	it('accepts a compare function directly', () => {
		expect(useSorted([1, 2, 3], (a, b) => b - a).value).toEqual([3, 2, 1]);
	});

	it('accepts compareFn inside options', () => {
		const result = useSorted(['b', 'a', 'c'], {
			compareFn: (a, b) => a.localeCompare(b)
		});

		expect(result.value).toEqual(['a', 'b', 'c']);
	});

	it('accepts a compare function plus options', () => {
		const result = useSorted([3, 1, 2], (a, b) => a - b, { dirty: false });

		expect(result.value).toEqual([1, 2, 3]);
	});

	it('supports a custom sortFn', () => {
		const result = useSorted([3, 1, 2], {
			sortFn: (arr, compare) => [...arr].sort(compare).reverse()
		});

		expect(result.value).toEqual([3, 2, 1]);
	});

	it('lets sortFn override the sort direction', () => {
		const result = useSorted([3, 1, 2], (a, b) => a - b, {
			sortFn: (arr, compare) => arr.sort((a, b) => -compare(a, b))
		});

		expect(result.value).toEqual([3, 2, 1]);
	});

	it('sorts objects with a compare function and leaves the source alone', () => {
		const users = [{ age: 30 }, { age: 20 }];
		const sorted = useSorted(users, (a, b) => a.age - b.age);

		expect(sorted.value).toEqual([{ age: 20 }, { age: 30 }]);
		expect(users).toEqual([{ age: 30 }, { age: 20 }]);
	});

	it('handles an empty list', () => {
		expect(useSorted([] as number[]).value).toEqual([]);
	});

	it('handles a single-element list', () => {
		expect(useSorted([1]).value).toEqual([1]);
	});

	it('reacts to source changes', () => {
		const box = createBox([3, 1]);
		const sorted = useSorted(() => box.value);

		expect(sorted.value).toEqual([1, 3]);
		box.value = [5, 4, 6];
		expect(sorted.value).toEqual([4, 5, 6]);
	});

	it('re-sorts in place after an in-place mutation', async () => {
		const box = createBox([3, 1, 2]);
		const sorted = useSorted(() => box.value);

		expect(sorted.value).toEqual([1, 2, 3]);
		box.value.push(0);
		await tick();
		expect(sorted.value).toEqual([0, 1, 2, 3]);
	});
});

describe('useSorted dirty mode', () => {
	it('sorts the source array in place', async () => {
		const box = createBox([3, 1, 2]);
		let seen: number[] | undefined;
		const { dispose } = await mountSetup(() => {
			seen = useSorted(() => box.value, { dirty: true }).value;
		});

		try {
			expect(box.value).toEqual([1, 2, 3]);
			expect(seen).toEqual([1, 2, 3]);
		} finally {
			await dispose();
		}
	});

	it('keeps sorting the source as it changes', async () => {
		const box = createBox([3, 1, 2]);
		const { dispose } = await mountSetup(() => {
			useSorted(() => box.value, { dirty: true });
		});

		try {
			expect(box.value).toEqual([1, 2, 3]);
			box.value.push(0);
			box.value = [...box.value];
			await tick();
			expect(box.value).toEqual([0, 1, 2, 3]);
		} finally {
			await dispose();
		}
	});

	it('returns the mutated source itself', async () => {
		const source = [3, 1, 2];
		let api: { value: number[] } | undefined;
		const { dispose } = await mountSetup(() => {
			api = useSorted(() => source, { dirty: true });
		});

		try {
			expect(api?.value).toBe(source);
		} finally {
			await dispose();
		}
	});

	it('honours a custom compare function', async () => {
		const box = createBox(['b', 'a', 'c']);
		const { dispose } = await mountSetup(() => {
			useSorted(() => box.value, { dirty: true, compareFn: (a, b) => a.localeCompare(b) });
		});

		try {
			expect(box.value).toEqual(['a', 'b', 'c']);
		} finally {
			await dispose();
		}
	});

	it('honours a custom sortFn', async () => {
		const box = createBox([3, 1, 2]);
		const { dispose } = await mountSetup(() => {
			useSorted(() => box.value, {
				dirty: true,
				sortFn: (arr, compare) => [...arr].sort(compare).reverse()
			});
		});

		try {
			expect(box.value).toEqual([3, 2, 1]);
		} finally {
			await dispose();
		}
	});

	it('settles instead of looping when the order is already correct', async () => {
		const box = createBox([1, 2, 3]);
		const { dispose } = await mountSetup(() => {
			useSorted(() => box.value, { dirty: true });
		});

		try {
			expect(box.value).toEqual([1, 2, 3]);
			await tick();
			expect(box.value).toEqual([1, 2, 3]);
		} finally {
			await dispose();
		}
	});

	it('stops sorting once disposed', async () => {
		const box = createBox([3, 1, 2]);
		const { dispose } = await mountSetup(() => {
			useSorted(() => box.value, { dirty: true });
		});

		expect(box.value).toEqual([1, 2, 3]);
		await dispose();
		box.value = [9, 7, 8];
		await tick();
		expect(box.value).toEqual([9, 7, 8]);
	});
});
