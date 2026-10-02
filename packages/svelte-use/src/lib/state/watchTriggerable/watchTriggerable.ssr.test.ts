/**
 * SSR probe (node environment, no DOM): under the node environment `svelte`
 * resolves to its server build, where `$effect` is inert. The returned handle
 * must still construct, and `trigger()` runs synchronously.
 */
import { describe, expect, it, vi } from 'vitest';

import { watchTriggerable } from './index.ts';

describe('watchTriggerable (ssr)', () => {
	it('constructs without running the callback', () => {
		const spy = vi.fn();
		const watch = watchTriggerable(
			() => 1,
			(value) => spy(value)
		);

		expect(spy).not.toHaveBeenCalled();
		expect(typeof watch.trigger).toBe('function');
		watch.stop();
	});

	it('trigger runs synchronously and returns the callback result', () => {
		const watch = watchTriggerable(
			() => 5,
			(value) => value * 2
		);

		expect(watch.trigger()).toBe(10);
		watch.stop();
	});
});
