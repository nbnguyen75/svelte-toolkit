/**
 * SSR probe (node environment, no DOM): no window, no navigator, so support
 * is false and every field reads its offline-safe default.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useNetwork } from './index.ts';

describe('useNetwork (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('is unsupported with safe defaults', () => {
		const net = useNetwork();

		expect(net.isSupported).toBe(false);
		expect(net.isOnline).toBe(true);
		expect(net.type).toBe('unknown');
		expect(net.offlineAt).toBe(undefined);
		expect(net.downlink).toBe(undefined);
	});
});
