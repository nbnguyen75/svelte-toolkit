/**
 * SSR probe (node environment, no DOM): under the node environment `svelte`
 * resolves to its server build, where runes are inert — which is exactly real
 * SSR. `$effect` never runs, so `immediate: true` must not start a server-side
 * interval that keeps the process alive.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useIntervalFn } from './index.ts';

afterEach(() => {
	vi.useRealTimers();
});

describe('useIntervalFn (ssr)', () => {
	it('constructs without a DOM and never starts', () => {
		vi.useFakeTimers();
		const spy = vi.fn();
		const api = useIntervalFn(spy, 100);

		// `$effect` is inert here, so the auto-start never happens.
		expect(api.isActive).toBe(false);
		vi.advanceTimersByTime(1000);
		expect(spy).not.toHaveBeenCalled();
	});

	it('still exposes working controls', () => {
		vi.useFakeTimers();
		const spy = vi.fn();
		const api = useIntervalFn(spy, 100, { immediate: false });

		expect(() => api.resume()).not.toThrow();
		expect(api.isActive).toBe(true);
		vi.advanceTimersByTime(300);
		expect(spy).toHaveBeenCalledTimes(3);
		api.pause();
		vi.advanceTimersByTime(1000);
		expect(spy).toHaveBeenCalledTimes(3);
	});
});
