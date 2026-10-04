/**
 * SSR probe (node environment, no DOM): there is nothing to measure and no
 * `requestAnimationFrame` to schedule against, so `update` must be inert and
 * the box must stay at zeroes rather than throw.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useElementBounding } from './index.ts';

describe('useElementBounding (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('keeps the box at zeroes', () => {
		const { height, bottom, left, right, top, width, x, y } = useElementBounding(null);

		expect({ height, bottom, left, right, top, width, x, y }).toEqual({
			height: 0,
			bottom: 0,
			left: 0,
			right: 0,
			top: 0,
			width: 0,
			x: 0,
			y: 0
		});
	});

	it('ignores update instead of throwing', () => {
		const bounds = useElementBounding(null);

		expect(() => bounds.update()).not.toThrow();
		expect(bounds.width).toBe(0);
	});

	it('ignores a next-frame update without requestAnimationFrame', () => {
		const bounds = useElementBounding(null, { updateTiming: 'next-frame' });

		expect(() => bounds.update()).not.toThrow();
		expect(bounds.width).toBe(0);
	});
});
