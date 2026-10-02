// Default `node` environment: no window, no document. Pure derived transforms
// must compute the same value on the server as in the browser.
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../is.ts';
import { useArrayEvery } from './index.ts';

describe('useArrayEvery (ssr)', () => {
	it('runs in a server environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('reports a match without touching the DOM', () => {
		expect(useArrayEvery([2, 4], (n) => n % 2 === 0).value).toBe(true);
		expect(useArrayEvery([2, 3], (n) => n % 2 === 0).value).toBe(false);
	});
});
