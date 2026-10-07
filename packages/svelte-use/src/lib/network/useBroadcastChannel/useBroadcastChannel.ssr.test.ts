/**
 * SSR probe (node environment, no DOM): no `BroadcastChannel`, so the channel
 * never opens — `post` and `close` are safe no-ops.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useBroadcastChannel } from './index.ts';

describe('useBroadcastChannel (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('is unsupported with empty state', () => {
		const bus = useBroadcastChannel<string, string>({ name: 'theme' });

		expect(bus.isSupported).toBe(false);
		expect(bus.channel).toBe(undefined);
		expect(bus.data).toBe(undefined);
		expect(bus.error).toBe(null);
		expect(bus.isClosed).toBe(false);
	});

	it('post and close do not throw without a channel', () => {
		const bus = useBroadcastChannel<string, string>({ name: 'theme' });

		expect(() => {
			bus.post('x');
			bus.close();
		}).not.toThrow();
		expect(bus.isClosed).toBe(true);
	});
});
