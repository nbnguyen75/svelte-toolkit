/**
 * SSR probe (node environment, no DOM): `window` and `document` do not exist,
 * so the listeners must bind nothing and the initial read must be skipped
 * rather than throwing.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useWindowFocus } from './index.ts';

describe('useWindowFocus (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('returns a readable unfocused state without throwing', () => {
		const { focused } = useWindowFocus();

		expect(focused).toBe(false);
	});
});
