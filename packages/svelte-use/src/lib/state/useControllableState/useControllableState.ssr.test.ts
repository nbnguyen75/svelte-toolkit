/**
 * SSR probe (node environment, no DOM): pure state, so the server answer is
 * the browser answer — the mode lock and the internal `$state` both work
 * without a document.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useControllableState } from './index.ts';

describe('useControllableState (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('holds internal state without a document', () => {
		const state = useControllableState<string>({ defaultValue: 'a' });

		expect(state.value).toBe('a');
		state.value = 'b';
		expect(state.value).toBe('b');
	});

	it('prefers the controlled value without a document', () => {
		const state = useControllableState<string>({ value: 'parent' });

		expect(state.value).toBe('parent');
		state.value = 'ignored';
		expect(state.value).toBe('parent');
	});
});
