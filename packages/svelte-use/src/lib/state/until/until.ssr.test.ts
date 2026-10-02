/**
 * SSR probe (node environment, no DOM): under the node environment `svelte`
 * resolves to its server build, where `$effect` is inert. An already-matching
 * matcher must still resolve synchronously, and a matcher that would have to
 * wait must stay pending without throwing.
 */
import { describe, expect, it } from 'vitest';

import { until } from './index.ts';

describe('until (ssr)', () => {
	it('resolves an already-matching value matcher', async () => {
		await expect(until(() => 5).toBe(5)).resolves.toBe(5);
		await expect(until(() => 'x').toBeTruthy()).resolves.toBe('x');
	});

	it('resolves an already-matching array matcher', async () => {
		await expect(until(() => [1, 2]).toContains(2)).resolves.toEqual([1, 2]);
	});

	it('stays pending for a matcher that needs a change', async () => {
		const pending = until(() => 1).toBe(2);
		const outcome = await Promise.race([pending.then(() => 'matched'), Promise.resolve('pending')]);

		expect(outcome).toBe('pending');
	});
});
