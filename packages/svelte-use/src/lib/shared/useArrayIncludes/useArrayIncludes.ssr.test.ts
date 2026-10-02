// Default `node` environment: no window, no document. Pure derived transforms
// must compute the same value on the server as in the browser.
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../is.ts';
import { useArrayIncludes } from './index.ts';

describe('useArrayIncludes (ssr)', () => {
	it('runs in a server environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('checks membership without touching the DOM', () => {
		expect(useArrayIncludes([1, 2, 3], 2).value).toBe(true);
		expect(useArrayIncludes([1, 2, 3], 9).value).toBe(false);
	});

	it('supports keys and fromIndex', () => {
		const rows = [{ id: 1 }, { id: 2 }];

		expect(useArrayIncludes(rows, 2, 'id').value).toBe(true);
		expect(useArrayIncludes([1, 2, 3], 1, { fromIndex: 1 }).value).toBe(false);
	});
});
