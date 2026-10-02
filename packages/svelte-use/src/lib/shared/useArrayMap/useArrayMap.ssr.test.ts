// Default `node` environment: no window, no document. Pure derived transforms
// must compute the same value on the server as in the browser.
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../is.ts';
import { useArrayMap } from './index.ts';

describe('useArrayMap (ssr)', () => {
	it('runs in a server environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('maps without touching the DOM', () => {
		expect(useArrayMap([1, 2, 3], (n) => n * 2).value).toEqual([2, 4, 6]);
	});
});
