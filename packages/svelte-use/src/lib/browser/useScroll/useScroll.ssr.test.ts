/**
 * SSR probe (node environment, no DOM): no `window`, no `document`, no
 * `getComputedStyle`, no `scrollTo`. `useScroll` must report zeroed state and
 * attach nothing rather than reaching for any of them.
 */
import { describe, expect, it, vi } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useScroll } from './index.ts';

describe('useScroll (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('constructs without a target and without touching the DOM', () => {
		expect(() => useScroll(null)).not.toThrow();

		const scroll = useScroll(null);
		expect(scroll.x).toBe(0);
		expect(scroll.y).toBe(0);
		expect(scroll.isScrolling).toBe(false);
	});

	it('constructs from a getter that would throw if resolved eagerly', () => {
		expect(() =>
			useScroll(() => {
				throw new Error('the target must not be read during SSR setup');
			})
		).not.toThrow();
	});

	it('reports the resting edge flags rather than throwing', () => {
		const scroll = useScroll(null);
		expect(scroll.arrivedState.left).toBe(true);
		expect(scroll.arrivedState.top).toBe(true);
		expect(scroll.arrivedState.right).toBe(false);
		expect(scroll.arrivedState.bottom).toBe(false);
		expect(scroll.directions.top).toBe(false);
		expect(scroll.directions.bottom).toBe(false);
	});

	it('never moves on assignment', () => {
		const scroll = useScroll(null);
		expect(() => {
			scroll.y = 500;
			scroll.x = 500;
		}).not.toThrow();

		// No container means no read-back, so the offset stays where it started
		// rather than reporting a scroll that never happened.
		expect(scroll.y).toBe(0);
		expect(scroll.x).toBe(0);
	});

	it('leaves measure() as a safe no-op', () => {
		const scroll = useScroll(null);
		expect(() => scroll.measure()).not.toThrow();
	});

	it('never reaches the error callback, because nothing is measured', () => {
		const onError = vi.fn();
		const scroll = useScroll(null, { observe: true, onError });
		scroll.measure();

		expect(onError).not.toHaveBeenCalled();
	});
});
