/**
 * SSR probe (node environment, no DOM): focus state stays false and assigning to
 * `focused` is inert rather than throwing on a missing element.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useFocus } from './index.ts';

describe('useFocus (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('reports no focus', () => {
		expect(useFocus(null).focused).toBe(false);
	});

	it('ignores assignments instead of throwing', () => {
		// Writes need the object: destructuring copies the getter's value and
		// leaves no setter behind, which is a JS accessor rule, not this util's.
		const focus = useFocus(null);

		expect(() => {
			focus.focused = true;
			focus.focused = false;
		}).not.toThrow();
		expect(focus.focused).toBe(false);
	});
});
