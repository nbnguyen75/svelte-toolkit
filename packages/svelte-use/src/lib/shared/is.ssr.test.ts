// Default `node` environment: no window, no document, no navigator.
// Every guard must degrade to a safe value rather than throw at import time.
import { describe, expect, it } from 'vitest';

import { isBrowser, isClient, isDef, isIOS, isObject, isWorker, notNullish, now } from './is.ts';

describe('is guards under SSR (node, no DOM)', () => {
	it('reports a server environment', () => {
		expect(isBrowser).toBe(false);
		expect(isClient).toBe(false);
		expect(isWorker).toBe(false);
	});

	it('isIOS returns false instead of touching window', () => {
		expect(isIOS()).toBe(false);
	});

	it('pure helpers still work', () => {
		expect(isDef(0)).toBe(true);
		expect(notNullish(null)).toBe(false);
		expect(isObject({ a: 1 })).toBe(true);
		expect(now()).toBeGreaterThan(0);
	});
});
