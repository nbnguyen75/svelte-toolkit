/**
 * SSR probe (node environment, no DOM): under the node environment `svelte`
 * resolves to its server build, where runes are inert. `performance` exists in
 * node, so the `useRafFn` loop underneath is what must stay inert — the reported
 * value must remain 0 rather than sampling against a clock that never advances.
 */
import { describe, expect, it, vi } from 'vitest';

import { useFps } from './index.ts';

describe('useFps (ssr)', () => {
	it('constructs and reports zero without ticking', () => {
		const api = useFps();

		expect(api.value).toBe(0);
	});

	it('returns a live zero when performance is unavailable', () => {
		const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'performance');
		Object.defineProperty(globalThis, 'performance', { configurable: true, value: undefined });
		try {
			const api = useFps();
			expect(api.value).toBe(0);
		} finally {
			if (descriptor) Object.defineProperty(globalThis, 'performance', descriptor);
		}
	});

	it('does not sample from a server render', () => {
		const spy = vi.spyOn(performance, 'now');
		try {
			useFps();
			expect(spy).toHaveBeenCalledTimes(1);
		} finally {
			spy.mockRestore();
		}
	});
});
