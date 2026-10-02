/**
 * SSR probe (node environment, no DOM): under the node environment `svelte`
 * resolves to its server build, where `$effect` is inert. `refAutoReset` must
 * construct, hold writes, and never arm a timer.
 */
import { describe, expect, it } from 'vitest';

import { refAutoReset } from './index.ts';

describe('refAutoReset (ssr)', () => {
	it('constructs and holds writes without arming a timer', () => {
		const state = refAutoReset('idle', 10);

		expect(state.value).toBe('idle');

		state.value = 'saved';

		expect(state.value).toBe('saved');
	});
});
