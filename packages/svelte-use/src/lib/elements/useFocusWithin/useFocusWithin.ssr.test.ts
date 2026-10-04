/**
 * SSR probe (node environment, no DOM): there is no element to be focused within,
 * so the flag stays false.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useFocusWithin } from './index.ts';

describe('useFocusWithin (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('reports no focus', () => {
		expect(useFocusWithin(null).focused).toBe(false);
	});
});
