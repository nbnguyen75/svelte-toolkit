/**
 * SSR probe (node environment, no DOM): no `window`, no `document`, no
 * `navigator`. `useScrollLock` must construct and report its state without
 * touching an element.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useScrollLock } from './index.ts';

describe('useScrollLock (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('constructs without a DOM', () => {
		expect(() => useScrollLock(null)).not.toThrow();
	});

	it.each([null, undefined])('constructs with a %s target', (target) => {
		expect(() => useScrollLock(target)).not.toThrow();
		expect(() => useScrollLock(() => target)).not.toThrow();
	});

	it('reports the unlocked default', () => {
		const lock = useScrollLock(null);
		expect(lock.locked).toBe(false);
	});

	it('honours initialState', () => {
		const lock = useScrollLock(null, true);
		expect(lock.locked).toBe(true);
	});

	it('never locks without a resolvable target', () => {
		const lock = useScrollLock(null);
		expect(() => {
			lock.locked = true;
		}).not.toThrow();

		// Nothing was resolved, so there is nothing to lock.
		expect(lock.locked).toBe(false);
	});

	it('accepts an unlock with no lock', () => {
		const lock = useScrollLock(null, true);
		lock.locked = false;
		expect(lock.locked).toBe(false);
	});

	it('exposes exactly locked', () => {
		expect(Object.keys(useScrollLock(null))).toEqual(['locked']);
	});
});
