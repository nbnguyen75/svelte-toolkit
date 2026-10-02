// Default `node` environment: no window, no document. Pure derived transforms
// must compute the same value on the server as in the browser.
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../is.ts';
import { useArrayUnique } from './index.ts';

describe('useArrayUnique (ssr)', () => {
	it('runs in a server environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('deduplicates without touching the DOM', () => {
		expect(useArrayUnique([1, 2, 1, 3]).value).toEqual([1, 2, 3]);
	});

	it('honours a custom comparator', () => {
		const rows = [{ id: 1 }, { id: 1 }, { id: 2 }];

		expect(useArrayUnique(rows, (a, b) => a.id === b.id).value).toEqual([{ id: 1 }, { id: 2 }]);
	});
});
