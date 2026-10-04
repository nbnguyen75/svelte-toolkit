/**
 * SSR probe (node environment, no DOM): the listeners must bind to nothing
 * rather than throw on a missing `window`, and the state must still be readable
 * so a component can render zeroes instead of crashing.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { usePointer } from './index.ts';

describe('usePointer (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('returns a readable zero state without throwing', () => {
		const pointer = usePointer();

		expect(pointer.x).toBe(0);
		expect(pointer.y).toBe(0);
		expect(pointer.pointerType).toBeNull();
		expect(pointer.isInside).toBe(false);
	});

	it('honours initialValue so the first paint is not all zeroes', () => {
		const pointer = usePointer({ initialValue: { x: 12, y: 34, pressure: 0.5 } });

		expect(pointer.x).toBe(12);
		expect(pointer.y).toBe(34);
		expect(pointer.pressure).toBe(0.5);
	});

	it('does not touch the named target while there is no DOM', () => {
		expect(() => usePointer({ target: () => document.body })).not.toThrow();
	});
});
