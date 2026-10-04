/**
 * SSR probe (node environment, no DOM): the listeners must bind to nothing
 * rather than throw on a missing `window`, and the state must still be readable
 * so a component can render before anything is dragged onto it.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useDropZone } from './index.ts';

describe('useDropZone (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('returns a readable empty state without throwing', () => {
		const zone = useDropZone(null);

		expect(zone.files).toBeNull();
		expect(zone.isOverDropZone).toBe(false);
	});

	it('takes a bare onDrop without touching the DOM', () => {
		expect(() => useDropZone(null, () => {})).not.toThrow();
	});
});
