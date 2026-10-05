/**
 * SSR probe (node environment, no DOM): there is no `requestAnimationFrame`, so
 * neither clock may start a loop. Both still read, and both still accept a
 * clock reading, because the value is computed at init rather than by a frame.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useNow } from './index.ts';
import { useTimestamp } from '../useTimestamp/index.ts';

describe('useNow / useTimestamp (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('useNow returns the render-time date and an idle loop', () => {
		const before = Date.now();
		const api = useNow();
		const after = Date.now();

		expect(api.now).toBeInstanceOf(Date);
		expect(api.now.getTime()).toBeGreaterThanOrEqual(before);
		expect(api.now.getTime()).toBeLessThanOrEqual(after);
		expect(api.isActive).toBe(false);
	});

	it('useNow controls are callable no-ops', () => {
		const api = useNow();

		expect(() => api.resume()).not.toThrow();
		expect(api.isActive).toBe(false);
		expect(() => api.pause()).not.toThrow();
		expect(api.isActive).toBe(false);
	});

	it('useTimestamp returns the render-time clock and an idle loop', () => {
		const before = Date.now();
		const api = useTimestamp();
		const after = Date.now();

		expect(api.timestamp).toBeGreaterThanOrEqual(before);
		expect(api.timestamp).toBeLessThanOrEqual(after);
		expect(api.isActive).toBe(false);
	});

	it('useTimestamp applies `offset` without a loop', () => {
		const api = useTimestamp({ offset: 1000 });

		expect(api.timestamp).toBeGreaterThanOrEqual(Date.now() + 999);
		expect(api.isActive).toBe(false);
	});

	it('useTimestamp controls are callable and the callback never fires', () => {
		let calls = 0;
		const api = useTimestamp({
			callback: () => {
				calls++;
			}
		});

		api.resume();
		api.pause();

		expect(calls).toBe(0);
		expect(api.isActive).toBe(false);
	});
});
