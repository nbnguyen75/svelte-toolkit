/**
 * SSR probe (node environment, no DOM): `MutationObserver` is never touched at
 * module scope, the target is ignored, and `stop` / `takeRecords` must be inert
 * rather than throw.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useMutationObserver } from './index.ts';

describe('useMutationObserver (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('reports no support', () => {
		expect(useMutationObserver(null, () => {}).isSupported).toBe(false);
	});

	it('reports no queued records', () => {
		expect(useMutationObserver(null, () => {}).takeRecords()).toBeUndefined();
	});

	it('ignores stop instead of throwing', () => {
		expect(() => useMutationObserver(null, () => {}).stop()).not.toThrow();
	});
});
