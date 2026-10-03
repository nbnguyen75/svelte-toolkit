/**
 * SSR probe (node environment, no DOM): no `window`, no `addEventListener`, no
 * `MouseEvent`. `useMousePressed` must construct and report its initial value
 * without attaching anything.
 */
import { describe, expect, it, vi } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import type { UseMousePressedOptions } from './index.ts';
import { useMousePressed } from './index.ts';

const ALL_OPTIONS: UseMousePressedOptions[] = [
	{},
	{ touch: false },
	{ drag: false },
	{ capture: true },
	{ initialValue: true },
	{ target: null },
	{ target: undefined },
	{ onPressed: () => {} },
	{ onReleased: () => {} },
	{ touch: false, drag: false, capture: true, initialValue: true }
];

describe('useMousePressed (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('constructs without a DOM', () => {
		expect(() => useMousePressed()).not.toThrow();
	});

	it.each(ALL_OPTIONS)('constructs with %o', (options) => {
		expect(() => useMousePressed(options)).not.toThrow();
	});

	it('reports the released default', () => {
		const state = useMousePressed();
		expect(state.pressed).toBe(false);
		expect(state.sourceType).toBeNull();
	});

	it('honours initialValue', () => {
		const state = useMousePressed({ initialValue: true });
		expect(state.pressed).toBe(true);
		// No device has pressed yet, so there is no source to report.
		expect(state.sourceType).toBeNull();
	});

	it('never fires a callback without an event', () => {
		const onPressed = vi.fn();
		const onReleased = vi.fn();
		useMousePressed({ onPressed, onReleased });

		expect(onPressed).not.toHaveBeenCalled();
		expect(onReleased).not.toHaveBeenCalled();
	});

	it('exposes a read-only surface', () => {
		expect(Object.keys(useMousePressed()).sort()).toEqual(['pressed', 'sourceType']);
	});
});
