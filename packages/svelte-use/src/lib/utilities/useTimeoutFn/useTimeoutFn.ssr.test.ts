/**
 * SSR probe (node environment, no DOM): under the node environment `svelte`
 * resolves to its server build, where runes are inert — which is exactly real
 * SSR. `$effect` never runs, so `immediate: true` must not arm a server-side
 * timer that keeps the process alive.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useTimeoutFn } from './index.ts';

afterEach(() => {
	vi.useRealTimers();
});

describe('useTimeoutFn (ssr)', () => {
	it('constructs without a DOM and never arms', () => {
		vi.useFakeTimers();
		const spy = vi.fn();
		const api = useTimeoutFn(spy, 100);

		// `$effect` is inert here, so the auto-arm never happens.
		expect(api.isPending).toBe(false);
		vi.advanceTimersByTime(1000);
		expect(spy).not.toHaveBeenCalled();
	});

	it('still exposes working controls', () => {
		vi.useFakeTimers();
		const spy = vi.fn();
		const api = useTimeoutFn(spy, 100, { immediate: false });

		expect(() => api.start()).not.toThrow();
		expect(api.isPending).toBe(true);
		vi.advanceTimersByTime(1000);
		expect(spy).toHaveBeenCalledTimes(1);

		expect(() => api.stop()).not.toThrow();
		expect(api.isPending).toBe(false);
	});
});
