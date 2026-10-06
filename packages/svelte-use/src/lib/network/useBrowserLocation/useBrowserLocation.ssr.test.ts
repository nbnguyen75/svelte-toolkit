/**
 * SSR probe (node environment, no DOM): no window, so every field is
 * `undefined` except the `load` trigger — and the setters are safe no-ops.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useBrowserLocation } from './index.ts';

describe('useBrowserLocation (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('snapshots an empty location', () => {
		const location = useBrowserLocation();

		expect(location.trigger).toBe('load');
		expect(location.href).toBe(undefined);
		expect(location.pathname).toBe(undefined);
		expect(location.length).toBe(undefined);
	});

	it('setters do not throw without a window', () => {
		const location = useBrowserLocation();

		expect(() => {
			location.hash = '#x';
		}).not.toThrow();
		expect(location.hash).toBe(undefined);
	});
});
