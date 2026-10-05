/**
 * SSR probe (node environment, no DOM): there is no cursor, no element box, and
 * no `document` to leave, so every listener must be skipped rather than throw,
 * the values must stay at their initial state, and `stop` must stay callable.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useMouseInElement } from './index.ts';

describe('useMouseInElement (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('defaults to no target without touching document', () => {
		const api = useMouseInElement();

		expect(api.x).toBe(0);
		expect(api.y).toBe(0);
		expect(api.sourceType).toBe(null);
		expect(api.isOutside).toBe(true);
		expect(api.elementX).toBe(0);
		expect(api.elementY).toBe(0);
		expect(api.elementPositionX).toBe(0);
		expect(api.elementPositionY).toBe(0);
		expect(api.elementWidth).toBe(0);
		expect(api.elementHeight).toBe(0);
	});

	it('returns a stop that is safe to call', () => {
		const api = useMouseInElement(null, { handleOutside: false, windowResize: false });

		expect(api.stop).toBeTypeOf('function');
		expect(() => api.stop()).not.toThrow();
	});
});
