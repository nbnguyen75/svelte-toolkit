/**
 * SSR probe (node environment, no DOM): under the node environment `svelte`
 * resolves to its server build, where runes are inert — which is exactly
 * real SSR. `useDark` must report light and touch no DOM or storage.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useDark } from './index.ts';

describe('useDark (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('starts light and never touches a DOM or storage global', () => {
		// `document` and `localStorage` do not exist here: any unguarded access
		// throws, so surviving the calls is the assertion.
		expect(() => useDark({ storageKey: 'su-dark-ssr' })).not.toThrow();

		const dark = useDark({ storageKey: 'su-dark-ssr' });
		expect(dark.value).toBe(false);
		expect(() => dark.toggle()).not.toThrow();
		expect(() => dark.setMode('dark')).not.toThrow();
	});
});
