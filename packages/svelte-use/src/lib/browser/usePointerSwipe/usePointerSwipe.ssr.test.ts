/**
 * SSR probe (node environment, no DOM): there is no element to bind to and no
 * `PointerEvent`, so nothing may throw and the util must read as idle.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { usePointerSwipe } from './index.ts';

describe('usePointerSwipe (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('reads as idle for a null target', () => {
		const api = usePointerSwipe(null);

		expect(api.isSwiping).toBe(false);
		expect(api.direction).toBe('none');
		expect(api.distanceX).toBe(0);
		expect(api.distanceY).toBe(0);
	});

	it('never dereferences a window-shaped getter', () => {
		const api = usePointerSwipe(() => window as never);

		expect(api.posStart).toEqual({ x: 0, y: 0 });
		expect(api.posEnd).toEqual({ x: 0, y: 0 });
	});

	it('stop() is a no-op off the browser', () => {
		const api = usePointerSwipe(null);

		expect(() => api.stop()).not.toThrow();
	});
});
