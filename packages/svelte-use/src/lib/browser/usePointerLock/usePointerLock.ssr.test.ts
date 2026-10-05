/**
 * SSR probe (node environment, no DOM): there is no Pointer Lock API, so
 * `lock` must reject rather than hang, and `unlock` must resolve `false` without
 * touching a `document` that does not exist.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { usePointerLock } from './index.ts';

describe('usePointerLock (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('is unsupported and unlocked', () => {
		const api = usePointerLock();

		expect(api.isSupported).toBe(false);
		expect(api.element).toBe(null);
		expect(api.triggerElement).toBe(null);
	});

	it('lock rejects instead of hanging', async () => {
		const api = usePointerLock();

		await expect(api.lock({} as Element)).rejects.toThrow('not supported');
	});

	it('unlock resolves false', async () => {
		const api = usePointerLock();

		await expect(api.unlock()).resolves.toBe(false);
	});
});
