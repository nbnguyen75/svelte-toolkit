/**
 * SSR probe (node environment, no DOM): `navigator` does not exist here, so the
 * util must report VueUse's `['en']` fallback and attach nothing.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { usePreferredLanguages } from './index.ts';

describe('usePreferredLanguages (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('falls back to en without reading navigator', () => {
		expect(() => usePreferredLanguages()).not.toThrow();

		const languages = usePreferredLanguages();
		expect(languages.value).toEqual(['en']);
	});

	it('hands every caller the same frozen-by-convention fallback array', () => {
		// VueUse returns a fresh ref per call; the array is a module constant,
		// so it must never be handed out in a writable position.
		const languages = usePreferredLanguages();
		expect(languages.value).toEqual(['en']);
	});
});
