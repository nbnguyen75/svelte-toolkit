// Default `node` environment: no window, no document. Pure derived transforms
// must compute the same value on the server as in the browser.
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../is.ts';
import { useArrayFilter } from './index.ts';

describe('useArrayFilter (ssr)', () => {
	it('runs in a server environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('filters without touching the DOM', () => {
		expect(useArrayFilter([1, 2, 3, 4], (n) => n % 2 === 0).value).toEqual([2, 4]);
	});
});
