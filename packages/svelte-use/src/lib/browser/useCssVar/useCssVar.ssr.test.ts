/**
 * SSR probe (node environment, no DOM): there is no element to read from or
 * write to, so the cell holds its initial value and touches nothing.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useCssVar } from './index.ts';

describe('useCssVar (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('holds the initial value without a document', () => {
		expect(useCssVar('--su-ssr', undefined, { initialValue: 'red' }).value).toBe('red');
		expect(useCssVar('--su-ssr').value).toBeUndefined();
	});

	it('accepts an assignment with no element to write to', () => {
		const css = useCssVar('--su-ssr', undefined, { initialValue: 'red' });
		css.value = 'blue';
		expect(css.value).toBe('blue');
	});
});
