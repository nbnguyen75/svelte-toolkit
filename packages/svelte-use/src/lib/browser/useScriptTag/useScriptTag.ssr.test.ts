/**
 * SSR probe (node environment, no DOM): there is no `document` to inject into,
 * so nothing may be created and the returned fallbacks must be reported.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useScriptTag } from './index.ts';

describe('useScriptTag (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('resolves false rather than rejecting', async () => {
		await expect(useScriptTag('https://cdn.example/lib.js').load()).resolves.toBe(false);
	});

	it('has no element and unload is a no-op', () => {
		const script = useScriptTag('https://cdn.example/lib.js', undefined, { manual: true });
		expect(script.scriptTag).toBeUndefined();
		expect(() => script.unload()).not.toThrow();
	});
});
