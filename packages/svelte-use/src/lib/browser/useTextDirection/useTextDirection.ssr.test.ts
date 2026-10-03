/**
 * SSR probe (node environment, no DOM): `document` does not exist here, so
 * `useTextDirection` must report `initialValue` and the setter must be inert.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useTextDirection } from './index.ts';

describe('useTextDirection (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('defaults to ltr without reading the DOM', () => {
		expect(() => useTextDirection()).not.toThrow();
		expect(useTextDirection().value).toBe('ltr');
	});

	it('honours a custom initialValue', () => {
		expect(useTextDirection({ initialValue: 'rtl' }).value).toBe('rtl');
	});

	it('writes the value locally while the setter stays inert', () => {
		const dir = useTextDirection({ observe: true });

		expect(() => {
			dir.value = 'rtl';
		}).not.toThrow();
		expect(dir.value).toBe('rtl');
	});
});
