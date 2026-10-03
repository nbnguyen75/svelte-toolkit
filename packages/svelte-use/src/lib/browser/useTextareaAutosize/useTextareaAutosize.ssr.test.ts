/**
 * SSR probe (node environment, no DOM): the measurement effects must find no
 * element and no `ResizeObserver` rather than throw.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useTextareaAutosize } from './index.ts';

describe('useTextareaAutosize (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('reports no measurement and no throw', () => {
		const autosize = useTextareaAutosize();
		expect(autosize.scrollHeight).toBe(0);
		expect(() => autosize.triggerResize()).not.toThrow();
	});
});
