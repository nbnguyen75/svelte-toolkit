/**
 * SSR probe (node environment, no DOM): `MediaQuery` needs `window.matchMedia`,
 * so the util must fall back to `'no-preference'` rather than throw.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { usePreferredReducedTransparency } from './index.ts';

describe('usePreferredReducedTransparency (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('falls back to no-preference without touching matchMedia', () => {
		expect(() => usePreferredReducedTransparency()).not.toThrow();

		const transparency = usePreferredReducedTransparency();
		expect(transparency.value).toBe('no-preference');
	});

	it('never reads a matchMedia global, which does not exist here', () => {
		// `window` is undefined in this environment, so any unguarded access
		// throws; surviving the read is the assertion.
		const transparency = usePreferredReducedTransparency();
		expect(transparency.value).toBe('no-preference');
	});
});
