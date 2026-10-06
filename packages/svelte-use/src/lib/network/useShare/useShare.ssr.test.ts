/**
 * SSR probe (node environment, no DOM): no navigator, so sharing is
 * unsupported and `share()` resolves without doing anything.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useShare } from './index.ts';

describe('useShare (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('is unsupported without a navigator', () => {
		expect(useShare().isSupported).toBe(false);
	});

	it('share resolves without a navigator', async () => {
		const { share } = useShare({ title: 'x' });

		await expect(share()).resolves.toBe(undefined);
	});
});
