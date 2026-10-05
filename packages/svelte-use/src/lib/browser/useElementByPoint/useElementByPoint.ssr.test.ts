/**
 * SSR probe (node environment, no DOM): there is no `document` to hit-test, so
 * nothing may throw and `element` must stay `null`.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useElementByPoint } from './index.ts';

describe('useElementByPoint (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('is unsupported and starts with no element', () => {
		const api = useElementByPoint({ x: () => 0, y: () => 0 });

		expect(api.isSupported).toBe(false);
		expect(api.element).toBe(null);
	});

	it('exposes the raf controls without touching the DOM', () => {
		const api = useElementByPoint({ x: 10, y: 20 });

		expect(api.isActive).toBe(false);
		expect(() => api.pause()).not.toThrow();
		expect(() => api.resume()).not.toThrow();
	});
});
