/**
 * Harness smoke test (node environment): proves DOM-less test runs,
 * `.svelte.ts` runes compilation, and fake-timer control. Intentionally
 * independent of `src/lib` so the harness stays green before any utility
 * is ported.
 */
import { describe, expect, it, vi } from 'vitest';

import { createCounter } from './fixtures/counter.svelte.ts';

describe('test harness (node)', () => {
	it('has no DOM globals', () => {
		expect(typeof window).toBe('undefined');
	});

	it('compiles and runs .svelte.ts runes modules', () => {
		const counter = createCounter(2);
		expect(counter.count).toBe(2);
		expect(counter.doubled).toBe(4);
		counter.increment(3);
		expect(counter.count).toBe(5);
		expect(counter.doubled).toBe(10);
		counter.reset();
		expect(counter.count).toBe(2);
	});

	it('controls timing with fake timers', () => {
		vi.useFakeTimers();
		try {
			const spy = vi.fn();
			setTimeout(spy, 200);
			expect(spy).not.toHaveBeenCalled();
			vi.advanceTimersByTime(200);
			expect(spy).toHaveBeenCalledTimes(1);
		} finally {
			vi.useRealTimers();
		}
	});
});
