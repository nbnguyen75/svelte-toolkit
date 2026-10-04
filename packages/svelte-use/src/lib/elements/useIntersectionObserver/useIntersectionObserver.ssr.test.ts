/**
 * SSR probe (node environment, no DOM): `IntersectionObserver` is never touched
 * at module scope, the target is ignored, and every control must be inert rather
 * than throw.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useIntersectionObserver } from './index.ts';

describe('useIntersectionObserver (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('reports no support', () => {
		expect(useIntersectionObserver(null, () => {}).isSupported).toBe(false);
	});

	it('is active but observes nothing, since no effect ever runs', () => {
		expect(useIntersectionObserver(null, () => {}).isActive).toBe(true);
	});

	it('ignores pause, resume and stop instead of throwing', () => {
		expect(() => useIntersectionObserver(null, () => {}).pause()).not.toThrow();
		expect(() => useIntersectionObserver(null, () => {}).resume()).not.toThrow();
		expect(() => useIntersectionObserver(null, () => {}).stop()).not.toThrow();
	});
});
