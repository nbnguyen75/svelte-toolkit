// @vitest-environment jsdom
import { tick } from 'svelte';
import { describe, expect, it } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { useArrayJoin } from './index.ts';

describe('useArrayJoin', () => {
	it('joins with the default separator', () => {
		expect(useArrayJoin([1, 2, 3]).value).toBe('1,2,3');
	});

	it('joins with a custom separator', () => {
		expect(useArrayJoin(['a', 'b'], ' - ').value).toBe('a - b');
	});

	it('joins with an empty separator', () => {
		expect(useArrayJoin(['a', 'b'], '').value).toBe('ab');
	});

	it('returns an empty string for an empty list', () => {
		expect(useArrayJoin([] as unknown[]).value).toBe('');
	});

	it('stringifies null and undefined as empty segments', () => {
		expect(useArrayJoin([1, null, 2], '-').value).toBe('1--2');
		expect(useArrayJoin([1, undefined, 2], '-').value).toBe('1--2');
	});

	it('tracks a reactive source', async () => {
		const box = createBox(['a', 'b']);
		const joined = useArrayJoin(() => box.value, '+');

		expect(joined.value).toBe('a+b');

		box.value = ['c', 'd', 'e'];
		await tick();
		expect(joined.value).toBe('c+d+e');
	});

	it('resolves a getter separator on every evaluation', async () => {
		let separator = '-';
		const box = createBox(['a', 'b']);
		const joined = useArrayJoin(
			() => box.value,
			() => separator
		);

		expect(joined.value).toBe('a-b');
		separator = '|';
		box.value = ['c', 'd'];
		await tick();
		expect(joined.value).toBe('c|d');
	});
});
