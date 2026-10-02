/**
 * SSR probe (node environment, no DOM): under the node environment `svelte`
 * resolves to its server build, where `$effect` is inert. `watchAtMost` must
 * construct a usable handle and never invoke the callback.
 */
import { describe, expect, it, vi } from 'vitest';

import { watchAtMost } from './index.ts';

describe('watchAtMost (ssr)', () => {
	it('constructs without running the callback', () => {
		const spy = vi.fn();
		const watch = watchAtMost(
			() => 1,
			(value) => spy(value),
			{ count: 1 }
		);

		expect(spy).not.toHaveBeenCalled();
		expect(watch.calls).toBe(0);

		watch.pause();
		watch.resume();
		watch.stop();
	});
});
