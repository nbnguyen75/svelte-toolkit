/**
 * SSR probe (node environment, no DOM): under the node environment `svelte`
 * resolves to its server build, where runes are inert — which is exactly real
 * SSR. `useCycleList` reads a plain array only, so cycling must work server-side.
 */
import { describe, expect, it } from 'vitest';

import { useCycleList } from './index.ts';

describe('useCycleList (ssr)', () => {
	it('cycles a plain array without a DOM', () => {
		const cycle = useCycleList(['a', 'b', 'c']);

		expect(cycle.value).toBe('a');
		expect(cycle.next()).toBe('b');
		expect(cycle.prev()).toBe('a');
		expect(cycle.index).toBe(0);
	});

	it('handles an empty list without a DOM', () => {
		const cycle = useCycleList<string[]>([]);

		expect(cycle.index).toBe(-1);
		expect(cycle.next()).toBeUndefined();
	});
});
