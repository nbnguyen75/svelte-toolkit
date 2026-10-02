/**
 * SSR probe (node environment, no DOM): under the node environment `svelte`
 * resolves to its server build, where runes are inert, and node has no
 * `requestAnimationFrame`. Both guards must hold with no DOM present.
 */
import { describe, expect, it, vi } from 'vitest';

import { useRafFn } from './index.ts';

describe('useRafFn (ssr)', () => {
	it('has no requestAnimationFrame and never starts', () => {
		const spy = vi.fn();
		const api = useRafFn(spy);

		expect(typeof requestAnimationFrame).toBe('undefined');
		expect(api.isActive).toBe(false);
	});

	it('resume is a no-op without requestAnimationFrame', () => {
		const spy = vi.fn();
		const api = useRafFn(spy);

		expect(() => api.resume()).not.toThrow();
		expect(api.isActive).toBe(false);
		expect(spy).not.toHaveBeenCalled();
	});

	it('pause is safe without requestAnimationFrame', () => {
		const api = useRafFn(() => {});

		expect(() => api.pause()).not.toThrow();
		expect(() => api.pause()).not.toThrow();
	});
});
