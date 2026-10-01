/**
 * SSR probe (node environment, no DOM): under the node environment `svelte`
 * resolves to its server build, where runes are inert — which is exactly
 * real SSR. Storage-backed cells must yield their defaults without touching
 * globals that do not exist on the server.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useLocalStorage, useSessionStorage, useStorage } from './index.ts';

describe('useStorage (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('returns the default without reading storage', () => {
		const local = useLocalStorage('su-ssr', 'fallback');
		expect(local.value).toBe('fallback');
		local.value = 'assigned';
		expect(local.value).toBe('assigned');

		const session = useSessionStorage('su-ssr', 0);
		expect(session.value).toBe(0);
	});

	it('useStorage tolerates a getStorage accessor that would throw', () => {
		const cell = useStorage('su-ssr', 'safe', () => {
			throw new Error('no storage on the server');
		});
		expect(cell.value).toBe('safe');
	});
});
