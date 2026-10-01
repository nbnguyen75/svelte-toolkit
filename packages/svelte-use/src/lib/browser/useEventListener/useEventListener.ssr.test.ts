/**
 * SSR probe (node environment, no DOM): under the node environment `svelte`
 * resolves to its server build, where runes are inert — which is exactly
 * real SSR. The util must import, construct, and no-op safely.
 */
import { describe, expect, it, vi } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useEventListener } from './index.ts';

describe('useEventListener (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('is a safe no-op without a DOM', () => {
		const handler = vi.fn();
		expect(() => useEventListener(() => window, 'click', handler)).not.toThrow();
		expect(() => useEventListener(() => document, 'click', handler)).not.toThrow();
		expect(() => useEventListener(() => null, 'click', handler)).not.toThrow();
		expect(handler).not.toHaveBeenCalled();
	});
});
