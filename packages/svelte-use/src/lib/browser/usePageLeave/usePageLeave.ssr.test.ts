/**
 * SSR probe (node environment, no DOM): `window` and `document` do not exist,
 * so the listeners must bind nothing rather than throwing, and the flag must
 * still be readable so a component can render.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { usePageLeave } from './index.ts';

describe('usePageLeave (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('returns a readable false state without throwing', () => {
		const { isLeft } = usePageLeave();

		expect(isLeft).toBe(false);
	});
});
