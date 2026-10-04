/**
 * SSR probe (node environment, no DOM): both window listeners must be skipped
 * rather than throw on a missing `window`, and `stop` must stay callable.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { onClickOutside } from './index.ts';

describe('onClickOutside (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('returns a controller without throwing', () => {
		const controller = onClickOutside(null, () => {});
		expect(controller.stop).toBeTypeOf('function');
		expect(controller.cancel).toBeTypeOf('function');
	});

	it('has a stop and a cancel that are safe to call', () => {
		const controller = onClickOutside(null, () => {});
		expect(() => controller.stop()).not.toThrow();
		expect(() => controller.cancel()).not.toThrow();
	});
});
