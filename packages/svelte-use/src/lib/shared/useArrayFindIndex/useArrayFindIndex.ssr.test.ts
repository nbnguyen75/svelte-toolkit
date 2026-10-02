// Default `node` environment: no window, no document. Pure derived transforms
// must compute the same value on the server as in the browser.
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../is.ts';
import { useArrayFindIndex } from './index.ts';

describe('useArrayFindIndex (ssr)', () => {
	it('runs in a server environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('reports the index without touching the DOM', () => {
		expect(useArrayFindIndex([1, 3, 4], (n) => n % 2 === 0).value).toBe(2);
		expect(useArrayFindIndex([1, 3], (n) => n % 2 === 0).value).toBe(-1);
	});
});
