/**
 * SSR probe (node environment, no DOM): there is no `URL` object-URL registry
 * to call, so the effect must never run and the value must stay `undefined`.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useObjectUrl } from './index.ts';

describe('useObjectUrl (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('reports no object URL for a source', () => {
		expect(useObjectUrl(new Blob(['a'])).value).toBeUndefined();
	});

	it('reports no object URL for a nullish source', () => {
		expect(useObjectUrl(undefined).value).toBeUndefined();
		expect(useObjectUrl(null).value).toBeUndefined();
	});
});
