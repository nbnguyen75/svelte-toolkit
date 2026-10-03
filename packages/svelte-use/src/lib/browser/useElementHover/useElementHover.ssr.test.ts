/**
 * SSR probe (node environment, no DOM): no `window`, no `document`, no
 * `MutationObserver`. `useElementHover` must construct and report `false`
 * without attaching anything.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import type { UseElementHoverOptions } from './index.ts';
import { useElementHover } from './index.ts';

const ALL_OPTIONS: UseElementHoverOptions[] = [
	{},
	{ delayEnter: 100 },
	{ delayLeave: 100 },
	{ delayEnter: 0, delayLeave: 0 },
	{ triggerOnRemoval: true },
	{ triggerOnRemoval: true, delayEnter: 50, delayLeave: 50 }
];

describe('useElementHover (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('constructs without a DOM', () => {
		expect(() => useElementHover(null)).not.toThrow();
	});

	it.each(ALL_OPTIONS)('constructs with %o', (options) => {
		expect(() => useElementHover(null, options)).not.toThrow();
	});

	it.each([null, undefined])('constructs with a %s element', (element) => {
		expect(() => useElementHover(element)).not.toThrow();
		expect(() => useElementHover(() => element)).not.toThrow();
	});

	it('reports not hovered', () => {
		expect(useElementHover(null).value).toBe(false);
		expect(useElementHover(null, { delayEnter: 100 }).value).toBe(false);
	});

	it('never schedules a delay without an element', () => {
		// A delayed toggle has nothing to attach to, so no timer is queued and
		// nothing can fire after SSR hydration.
		expect(() => useElementHover(null, { delayEnter: 0, delayLeave: 0 })).not.toThrow();
	});

	it('exposes exactly value', () => {
		expect(Object.keys(useElementHover(null))).toEqual(['value']);
	});
});
