/**
 * SSR probe (node environment, no DOM): under the node environment `svelte`
 * resolves to its server build, where runes are inert — which is exactly real
 * SSR. `useToggle` holds no browser API, so construction and mutation must work
 * without a DOM.
 */
import { describe, expect, it } from 'vitest';

import { useToggle } from './index.ts';

describe('useToggle (ssr)', () => {
	it('constructs and toggles without a DOM', () => {
		const toggle = useToggle();

		expect(toggle.value).toBe(false);
		expect(toggle.toggle()).toBe(true);
		expect(toggle.value).toBe(true);
	});

	it('supports two custom values without a DOM', () => {
		const toggle = useToggle<'on' | 'off', ''>('on', { truthyValue: 'on', falsyValue: '' });

		expect(toggle.toggle()).toBe('');
		expect(toggle.value).toBe('');
	});
});
