/**
 * SSR probe (node environment, no DOM): there is no `document.head` to inject
 * into, so nothing may be created and `load` must be inert.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useStyleTag } from './index.ts';

describe('useStyleTag (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('never reports itself loaded', () => {
		const style = useStyleTag('a{}', { id: 'ssr-style' });
		expect(style.isLoaded).toBe(false);
	});

	it('keeps the css readable without a DOM', () => {
		expect(useStyleTag('a { color: red }', { id: 'ssr-style' }).css).toBe('a { color: red }');
	});

	it('load and unload are no-ops', () => {
		const style = useStyleTag('a{}', { id: 'ssr-style', manual: true });
		style.load();
		expect(style.isLoaded).toBe(false);
		expect(() => style.unload()).not.toThrow();
	});
});
