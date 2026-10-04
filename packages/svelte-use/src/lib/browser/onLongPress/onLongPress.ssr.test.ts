/**
 * SSR probe (node environment, no DOM): nothing may be bound and the returned
 * stop must be safe to call.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { onLongPress } from './index.ts';

describe('onLongPress (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('returns a stop without throwing', () => {
		expect(onLongPress(null, () => {})).toBeTypeOf('function');
	});

	it('has a stop that is safe to call', () => {
		const stop = onLongPress(null, () => {});
		expect(() => stop()).not.toThrow();
	});
});
