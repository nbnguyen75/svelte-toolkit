// Default `node` environment: no window, no document. Pure derived transforms
// must compute the same value on the server as in the browser.
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../is.ts';
import { useArrayFind } from './index.ts';

describe('useArrayFind (ssr)', () => {
	it('runs in a server environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('finds without touching the DOM', () => {
		expect(useArrayFind([1, 2, 3], (n) => n > 1).value).toBe(2);
		expect(useArrayFind([1, 2], (n) => n > 5).value).toBeUndefined();
	});
});
