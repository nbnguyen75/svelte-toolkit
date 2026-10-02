// Default `node` environment: no window, no document. Pure derived transforms
// must compute the same value on the server as in the browser.
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../is.ts';
import { useArrayJoin } from './index.ts';

describe('useArrayJoin (ssr)', () => {
	it('runs in a server environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('joins without touching the DOM', () => {
		expect(useArrayJoin(['a', 'b'], ' - ').value).toBe('a - b');
		expect(useArrayJoin([1, 2, 3]).value).toBe('1,2,3');
	});
});
