/**
 * SSR probe (node environment, no DOM): on the server `createSharedComposable`
 * must not share anything, or one request's state would leak into the next.
 */
import { describe, expect, it, vi } from 'vitest';

import { createSharedComposable } from './index.ts';

describe('createSharedComposable (ssr)', () => {
	it('returns a fresh instance per call on the server', () => {
		const factory = vi.fn(() => ({ id: 1 }));
		const shared = createSharedComposable(factory);

		expect(shared()).not.toBe(shared());
		expect(factory).toHaveBeenCalledTimes(2);
	});
});
