/**
 * SSR probe (node environment, no DOM): there is no window to scroll and no
 * IntersectionObserver, so nothing may load and nothing may throw on a missing
 * `document`.
 */
import { describe, expect, it, vi } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useInfiniteScroll } from './index.ts';

describe('useInfiniteScroll (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('returns an idle controller for a null element', () => {
		const load = vi.fn();
		const api = useInfiniteScroll(null, load, { interval: 0 });

		expect(api.isLoading).toBe(false);
		expect(api.reset).toBeTypeOf('function');
	});

	it('never loads and never throws', async () => {
		const load = vi.fn();
		const api = useInfiniteScroll(() => window as never, load, { interval: 0 });

		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(load).not.toHaveBeenCalled();
		expect(api.isLoading).toBe(false);
		expect(() => api.reset()).not.toThrow();
	});
});
