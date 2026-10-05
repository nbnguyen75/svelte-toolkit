/**
 * SSR probe (node environment, no DOM): there is no document to ask about
 * support and no element to fullscreen, so every control must be a safe no-op
 * while the state stays readable.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useFullscreen } from './index.ts';

describe('useFullscreen (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('reports no support and not fullscreen', () => {
		const api = useFullscreen(null);

		expect(api.isSupported).toBe(false);
		expect(api.isFullscreen).toBe(false);
	});

	it('has controls that resolve without throwing', async () => {
		const api = useFullscreen(null);

		await expect(api.enter()).resolves.toBeUndefined();
		await expect(api.exit()).resolves.toBeUndefined();
		await expect(api.toggle()).resolves.toBeUndefined();
		expect(api.isFullscreen).toBe(false);
	});
});
