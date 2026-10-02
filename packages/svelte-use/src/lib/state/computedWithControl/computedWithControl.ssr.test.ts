/**
 * SSR probe (node environment, no DOM): under the node environment `svelte`
 * resolves to its server build, where `$effect` is inert. `computedWithControl`
 * must still compute lazily on read, and `trigger()` must still invalidate.
 */
import { describe, expect, it } from 'vitest';

import { computedWithControl } from './index.ts';

describe('computedWithControl (ssr)', () => {
	it('computes on read, caches, and re-computes after trigger', () => {
		let calls = 0;
		const total = computedWithControl(
			() => 2,
			() => {
				calls += 1;
				return 21;
			}
		);

		expect(total.value).toBe(21);
		expect(total.value).toBe(21);
		expect(calls).toBe(1);

		total.trigger();

		expect(total.value).toBe(21);
		expect(calls).toBe(2);
	});

	it('supports the writable overload', () => {
		let stored = 0;
		const cell = computedWithControl(() => 0, {
			get: () => stored,
			set: (value: number) => {
				stored = value;
			}
		});

		cell.value = 5;
		cell.trigger();

		expect(cell.value).toBe(5);
	});
});
