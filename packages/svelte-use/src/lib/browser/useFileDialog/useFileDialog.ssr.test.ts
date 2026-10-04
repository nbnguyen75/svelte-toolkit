/**
 * SSR probe (node environment, no DOM): there is no `document`, so no input is
 * created and `open()` must be inert rather than throw.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useFileDialog } from './index.ts';

describe('useFileDialog (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('reports no input', () => {
		expect(useFileDialog().input).toBeUndefined();
	});

	it('reports no selection', () => {
		expect(useFileDialog().files).toBeNull();
	});

	it('ignores open instead of throwing', () => {
		expect(() => useFileDialog().open()).not.toThrow();
	});

	it('ignores reset instead of throwing', () => {
		expect(() => useFileDialog().reset()).not.toThrow();
	});
});
