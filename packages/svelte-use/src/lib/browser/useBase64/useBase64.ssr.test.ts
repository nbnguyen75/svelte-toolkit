/**
 * SSR probe (node environment, no DOM): there is no `FileReader`, `btoa` or
 * `canvas`, so nothing may be encoded and a manual `execute` must stay inert.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useBase64 } from './index.ts';

describe('useBase64 (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('reports no encoding for a source', () => {
		expect(useBase64('text').base64).toBe('');
	});

	it('reports no encoding for object input', () => {
		expect(useBase64({ a: 1 }).base64).toBe('');
	});

	it('reports no in-flight promise', () => {
		expect(useBase64('text').promise).toBeUndefined();
	});

	it('resolves empty for a manual execute instead of throwing', async () => {
		await expect(useBase64('text').execute()).resolves.toBe('');
	});
});
