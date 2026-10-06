/**
 * SSR probe (node environment, no DOM): no window, so the params start from
 * `initialValue` and edits stay local — nothing is read or written.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useUrlSearchParams } from './index.ts';

describe('useUrlSearchParams (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('starts from the initial value', () => {
		const params = useUrlSearchParams('history', { initialValue: { page: '1' } });

		expect(params.page).toBe('1');
	});

	it('keeps edits local', () => {
		const params = useUrlSearchParams('history');

		params.page = '2';

		expect(params.page).toBe('2');
	});
});
