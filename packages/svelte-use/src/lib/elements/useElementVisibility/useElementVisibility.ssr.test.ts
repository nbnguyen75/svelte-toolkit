/**
 * SSR probe (node environment, no DOM): no observer is constructed, so
 * `isVisible` is just the initial value and `stop` must be inert rather than
 * throw.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useElementVisibility } from './index.ts';

describe('useElementVisibility (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('reports the initial value', () => {
		expect(useElementVisibility(null).isVisible).toBe(false);
		expect(useElementVisibility(null, { initialValue: true }).isVisible).toBe(true);
	});

	it('ignores stop instead of throwing', () => {
		expect(() => useElementVisibility(null).stop()).not.toThrow();
	});
});
