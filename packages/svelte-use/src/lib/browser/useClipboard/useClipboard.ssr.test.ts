/**
 * SSR probe (node environment, no DOM): Node ships a global `navigator`, but
 * without a `clipboard` member, so `isSupported` must be `false` and `copy`
 * must no-op instead of throwing.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useClipboard } from './index.ts';

describe('useClipboard (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('is unsupported and copy is a no-op', async () => {
		const clipboard = useClipboard();
		expect(clipboard.isSupported).toBe(false);
		await expect(clipboard.copy('anything')).resolves.toBeUndefined();
		expect(clipboard.copied).toBe(false);
		expect(clipboard.text).toBe('');
	});
});
