// Default `node` environment: no window, no document. Copy mode is pure derived
// logic and must sort identically on the server. `dirty` mode is deliberately
// excluded: it registers an `$effect`, which has no place in an SSR render.
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../is.ts';
import { useSorted } from './index.ts';

describe('useSorted (ssr)', () => {
	it('runs in a server environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('sorts a copy without touching the DOM', () => {
		const source = [3, 1, 2];

		expect(useSorted(source).value).toEqual([1, 2, 3]);
		expect(source).toEqual([3, 1, 2]);
	});

	it('honours a compare function', () => {
		expect(useSorted([1, 2, 3], (a, b) => b - a).value).toEqual([3, 2, 1]);
	});
});
