/**
 * SSR probe (node environment, no DOM): the listeners must bind to nothing
 * rather than throw on a missing `window`, and the returned state must still be
 * readable so a component can render the element at its start position.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useDraggable } from './index.ts';

describe('useDraggable (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('returns readable state without throwing', () => {
		const drag = useDraggable(null);

		expect(drag.position).toEqual({ x: 0, y: 0 });
		expect(drag.isDragging).toBe(false);
		expect(drag.style).toBe('left: 0px; top: 0px;');
	});

	it('honours initialValue so the first paint is in the right place', () => {
		const drag = useDraggable(null, { initialValue: { x: 30, y: 40 } });

		expect(drag.style).toBe('left: 30px; top: 40px;');
	});
});
