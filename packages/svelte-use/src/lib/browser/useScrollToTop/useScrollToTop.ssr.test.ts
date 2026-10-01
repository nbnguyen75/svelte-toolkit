/**
 * SSR probe (node environment, no DOM): under the node environment `svelte`
 * resolves to its server build, where runes are inert — which is exactly
 * real SSR. The util must import, construct, and no-op safely.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useScrollToTop, type UseScrollToTopReturn } from './index.ts';

describe('useScrollToTop (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('constructs without a DOM and scrollToTop resolves immediately', async () => {
		const api: UseScrollToTopReturn = useScrollToTop();
		expect(api.scrolling).toBe(false);
		await api.scrollToTop();
		expect(api.scrolling).toBe(false);
		api.cancel();
		expect(api.scrolling).toBe(false);
	});

	it('constructs with an explicit element target without writing', async () => {
		let writes = 0;
		const fake = {
			scrollTo: () => {
				writes += 1;
			},
			scrollTop: 250,
			scrollY: undefined
		} as unknown as HTMLElement;
		const api: UseScrollToTopReturn = useScrollToTop(() => fake);
		await api.scrollToTop();
		expect(api.scrolling).toBe(false);
		expect(fake.scrollTop).toBe(250);
		expect(writes).toBe(0);
	});
});
