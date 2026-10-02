/**
 * SSR probe (node environment, no DOM): under the node environment `svelte`
 * resolves to its server build, where runes are inert — which is exactly real
 * SSR. `$effect` never runs, so `useLastChanged` must report "no change" and
 * must not read the clock while constructing.
 */
import { describe, expect, it } from 'vitest';

import { useLastChanged } from './index.ts';

describe('useLastChanged (ssr)', () => {
	it('constructs and reports no change', () => {
		const last = useLastChanged(1);

		expect(last.hasChanged).toBe(false);
		expect(last.timestamp).toBe(0);
	});

	it('constructs with immediate without stamping', () => {
		const last = useLastChanged(1, { immediate: true, timestamp: () => 7 });

		// The effect is inert here, so nothing has stamped yet.
		expect(last.hasChanged).toBe(false);
	});
});
