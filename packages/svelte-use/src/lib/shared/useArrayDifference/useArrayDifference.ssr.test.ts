// Default `node` environment: no window, no document. Pure derived transforms
// must compute the same value on the server as in the browser.
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../is.ts';
import { useArrayDifference } from './index.ts';

describe('useArrayDifference (ssr)', () => {
	it('runs in a server environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('computes the difference without touching the DOM', () => {
		expect(useArrayDifference([1, 2, 3], [2]).value).toEqual([1, 3]);
	});

	it('supports keys and symmetric mode', () => {
		const rows = [{ id: 1 }, { id: 2 }];
		const other = [{ id: 2 }];

		expect(useArrayDifference(rows, other, 'id').value).toEqual([{ id: 1 }]);
		expect(useArrayDifference([1, 2], [2, 3], undefined, { symmetric: true }).value).toEqual([
			1, 3
		]);
	});
});
