// Default `node` environment: no window, no document. Pure derived transforms
// must compute the same value on the server as in the browser.
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../is.ts';
import { useArrayFindLast } from './index.ts';

describe('useArrayFindLast (ssr)', () => {
	it('runs in a server environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('finds from the end without touching the DOM', () => {
		expect(useArrayFindLast([2, 1, 4], (n) => n % 2 === 0).value).toBe(4);
		expect(useArrayFindLast([1, 3], (n) => n % 2 === 0).value).toBeUndefined();
	});
});
