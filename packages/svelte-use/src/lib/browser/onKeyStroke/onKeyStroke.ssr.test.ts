/**
 * SSR probe (node environment, no DOM): the listener must attach to nothing
 * rather than throw on a missing `window`.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { onKeyStroke } from './index.ts';

describe('onKeyStroke (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('attaches nothing and does not throw', () => {
		expect(() => onKeyStroke('a', () => {})).not.toThrow();
		expect(() => onKeyStroke(() => {})).not.toThrow();
	});
});
