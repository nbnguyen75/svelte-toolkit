/**
 * SSR probe (node environment, no DOM): under the node environment `svelte`
 * resolves to its server build, where runes are inert — which is exactly real
 * SSR. Nothing may tick on the server unless the caller explicitly starts it.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useCountdown } from './index.ts';

afterEach(() => {
	vi.useRealTimers();
});

describe('useCountdown (ssr)', () => {
	it('constructs without a DOM and does not tick', () => {
		vi.useFakeTimers();
		const onTick = vi.fn();
		const onComplete = vi.fn();
		const api = useCountdown(3, { onComplete, onTick });

		expect(api.remaining).toBe(3);
		expect(api.isActive).toBe(false);
		vi.advanceTimersByTime(5000);
		expect(onTick).not.toHaveBeenCalled();
		expect(onComplete).not.toHaveBeenCalled();
		expect(api.remaining).toBe(3);
	});

	it('exposes working controls without a DOM', () => {
		vi.useFakeTimers();
		const onTick = vi.fn();
		const api = useCountdown(3, { onTick });

		// An explicit start() does tick on the server — that is the caller's
		// choice, not something the module does on its own.
		api.start();
		expect(api.isActive).toBe(true);
		vi.advanceTimersByTime(3000);
		expect(onTick).toHaveBeenCalledTimes(3);
		expect(api.remaining).toBe(0);
		expect(api.isActive).toBe(false);
	});
});
