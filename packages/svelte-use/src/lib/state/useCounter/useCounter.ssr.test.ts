/**
 * SSR probe (node environment, no DOM): under the node environment `svelte`
 * resolves to its server build, where runes are inert — which is exactly real
 * SSR. `useCounter` is pure arithmetic, so every mutator must work server-side.
 */
import { describe, expect, it } from 'vitest';

import { useCounter } from './index.ts';

describe('useCounter (ssr)', () => {
	it('constructs and counts without a DOM', () => {
		const counter = useCounter(1);

		expect(counter.count).toBe(1);
		counter.inc();
		expect(counter.count).toBe(2);
		counter.dec(2);
		expect(counter.count).toBe(0);
	});

	it('honours bounds without a DOM', () => {
		const counter = useCounter(0, { min: 0, max: 2 });

		counter.inc(5);
		expect(counter.count).toBe(2);
		counter.reset();
		expect(counter.count).toBe(0);
	});
});
