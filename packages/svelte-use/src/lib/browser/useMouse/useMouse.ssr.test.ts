/**
 * SSR probe (node environment, no DOM): no `window`, no `addEventListener`, no
 * `TouchEvent`. `useMouse` must construct, report its initial value, and attach
 * nothing.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import type { UseMouseOptions } from './index.ts';
import { useMouse } from './index.ts';

/** Every option that resolves a target or a listener, to prove none throws. */
const ALL_OPTIONS: UseMouseOptions[] = [
	{},
	{ type: 'client' },
	{ type: 'movement' },
	{ type: 'page' },
	{ type: 'screen' },
	{ touch: false },
	{ scroll: false },
	{ resetOnTouchEnds: true },
	{ initialValue: { x: 7, y: 8 } },
	{ target: null },
	{ target: undefined }
];

describe('useMouse (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('constructs without a DOM', () => {
		expect(() => useMouse()).not.toThrow();
	});

	it.each(ALL_OPTIONS)('constructs with %o', (options) => {
		expect(() => useMouse(options)).not.toThrow();
	});

	it('reports the initial value', () => {
		const mouse = useMouse({ initialValue: { x: 3, y: 4 } });
		expect(mouse.x).toBe(3);
		expect(mouse.y).toBe(4);
		expect(mouse.sourceType).toBeNull();
	});

	it('defaults to a zero position with no source', () => {
		const mouse = useMouse();
		expect(mouse.x).toBe(0);
		expect(mouse.y).toBe(0);
		expect(mouse.sourceType).toBeNull();
	});

	it('exposes a read-only surface', () => {
		const mouse = useMouse();
		expect(Object.keys(mouse).sort()).toEqual(['sourceType', 'x', 'y']);
	});
});
