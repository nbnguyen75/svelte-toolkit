// Default `node` environment: no window, no document. Pure derived transforms
// must compute the same value on the server as in the browser.
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../is.ts';
import { useArrayReduce } from './index.ts';

describe('useArrayReduce (ssr)', () => {
	it('runs in a server environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('reduces with and without an initial value', () => {
		expect(useArrayReduce([1, 2, 3], (sum, n) => sum + n).value).toBe(6);
		expect(useArrayReduce([1, 2, 3], (sum, n) => sum + n, 100).value).toBe(106);
	});

	it('still throws on an empty list without an initial value', () => {
		expect(() => useArrayReduce([], (sum: number, n: number) => sum + n).value).toThrow(TypeError);
	});
});
