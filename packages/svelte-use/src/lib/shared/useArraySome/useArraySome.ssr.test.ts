// Default `node` environment: no window, no document. Pure derived transforms
// must compute the same value on the server as in the browser.
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../is.ts';
import { useArraySome } from './index.ts';

describe('useArraySome (ssr)', () => {
	it('runs in a server environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('reports a match without touching the DOM', () => {
		expect(useArraySome([1, 2, 3], (n) => n > 2).value).toBe(true);
		expect(useArraySome([1, 2], (n) => n > 5).value).toBe(false);
	});
});
