/**
 * SSR probe (node environment, no DOM): there is no `CSS` object to ask, so
 * the probe must report `ssrValue` and never reach the browser API.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useCssSupports } from './index.ts';

describe('useCssSupports (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('falls back to ssrValue instead of probing', () => {
		expect(useCssSupports('display', 'grid').isSupported).toBe(false);
		expect(useCssSupports('display', 'grid', { ssrValue: true }).isSupported).toBe(true);
		expect(useCssSupports('display: grid').isSupported).toBe(false);
		expect(useCssSupports('display: grid', { ssrValue: true }).isSupported).toBe(true);
	});
});
