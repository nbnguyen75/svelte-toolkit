/**
 * SSR probe (node environment, no DOM): no `EventSource`, so nothing opens —
 * `open` and `close` are safe no-ops and every field reads its default.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useEventSource } from './index.ts';

describe('useEventSource (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('starts closed with empty state', () => {
		const feed = useEventSource<string>(() => '/feed', []);

		expect(feed.status).toBe('CONNECTING');
		expect(feed.data).toBe(null);
		expect(feed.event).toBe(null);
		expect(feed.error).toBe(null);
		expect(feed.eventSource).toBe(null);
		expect(feed.lastEventId).toBe(null);
	});

	it('open and close do not throw without a platform class', () => {
		const feed = useEventSource<string>(() => '/feed', []);

		expect(() => {
			feed.open();
			feed.close();
		}).not.toThrow();
	});
});
