/**
 * SSR probe (node environment, no DOM): under the node environment `svelte`
 * resolves to its server build, where `$effect` is inert. `watchArray` must
 * construct a stop function without invoking the callback.
 */
import { describe, expect, it, vi } from 'vitest';

import { watchArray } from './index.ts';

describe('watchArray (ssr)', () => {
	it('constructs without running the callback', () => {
		const spy = vi.fn();
		const stop = watchArray(
			() => [1, 2],
			(value, oldValue, added, removed) => spy(value, oldValue, added, removed),
			{ immediate: true }
		);

		expect(spy).not.toHaveBeenCalled();
		expect(typeof stop).toBe('function');
		stop();
	});
});
