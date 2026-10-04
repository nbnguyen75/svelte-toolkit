/**
 * SSR probe (node environment, no DOM): the listeners must bind to nothing
 * rather than throw on a missing `window`, and the state must still be readable
 * so a component can render before a finger ever lands.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useSwipe } from './index.ts';

describe('useSwipe (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('returns a readable idle state without throwing', () => {
		const swipe = useSwipe(null);

		expect(swipe.direction).toBe('none');
		expect(swipe.isSwiping).toBe(false);
		expect(swipe.lengthX).toBe(0);
		expect(swipe.lengthY).toBe(0);
		expect(swipe.coordsStart).toEqual({ x: 0, y: 0 });
	});

	it('exposes a stop that is safe to call with nothing bound', () => {
		const swipe = useSwipe(null);

		expect(() => swipe.stop()).not.toThrow();
	});
});
