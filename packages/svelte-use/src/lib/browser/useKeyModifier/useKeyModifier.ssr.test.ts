/**
 * SSR probe (node environment, no DOM): the listeners must attach to nothing,
 * and the pressed state must stay at its documented `null`.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useKeyModifier } from './index.ts';

describe('useKeyModifier (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('reports null without ever seeing an event', () => {
		expect(useKeyModifier('Shift').value).toBeNull();
	});

	it('still honours an explicit initial value', () => {
		expect(useKeyModifier('Shift', { initial: true }).value).toBe(true);
		expect(useKeyModifier('Shift', { initial: false }).value).toBe(false);
	});
});
