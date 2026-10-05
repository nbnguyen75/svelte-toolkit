/**
 * SSR probe (node environment, no DOM): pure math, so the server answer is
 * the same as the browser one — no fallback, nothing guarded.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../is.ts';
import { usePrecision } from './index.ts';

describe('usePrecision (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('rounds without a document', () => {
		expect(usePrecision(45.125, 2).value).toBe(45.13);
	});

	it('honours the method without a document', () => {
		expect(usePrecision(45.129, 2, { math: 'floor' }).value).toBe(45.12);
		expect(usePrecision(45.121, 2, { math: 'ceil' }).value).toBe(45.13);
	});

	it('reads getters without a document', () => {
		expect(
			usePrecision(
				() => 45.125,
				() => 2
			).value
		).toBe(45.13);
	});
});
