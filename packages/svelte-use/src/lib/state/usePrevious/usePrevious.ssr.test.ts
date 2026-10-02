/**
 * SSR probe (node environment, no DOM): under the node environment `svelte`
 * resolves to its server build, where runes are inert — which is exactly real
 * SSR. `$effect` never runs, so `usePrevious` must return its initial value and
 * must not touch the DOM while constructing.
 */
import { describe, expect, it } from 'vitest';

import { usePrevious } from './index.ts';

describe('usePrevious (ssr)', () => {
	it('constructs and returns the initial value', () => {
		const read = usePrevious(1, 'seed');

		expect(read()).toBe('seed');
	});

	it('constructs without an initial value', () => {
		const read = usePrevious(() => 1);

		expect(read()).toBeUndefined();
	});
});
