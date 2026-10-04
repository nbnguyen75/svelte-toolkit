/**
 * SSR probe (node environment, no DOM): `ResizeObserver` is never touched at
 * module scope, the target is ignored, and `stop` must be inert rather than
 * throw.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useResizeObserver } from './index.ts';

describe('useResizeObserver (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('reports no support', () => {
		expect(useResizeObserver(null, () => {}).isSupported).toBe(false);
	});

	it('ignores stop instead of throwing', () => {
		expect(() => useResizeObserver(null, () => {}).stop()).not.toThrow();
	});
});
