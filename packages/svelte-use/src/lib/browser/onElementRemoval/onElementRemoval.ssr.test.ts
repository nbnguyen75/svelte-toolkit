/**
 * SSR probe (node environment, no DOM): there is no `MutationObserver` and no
 * document to watch, so nothing may throw and `stop()` must stay callable.
 */
import { describe, expect, it, vi } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { onElementRemoval } from './index.ts';

describe('onElementRemoval (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('never fires, even with a target', () => {
		const callback = vi.fn();
		const stop = onElementRemoval(() => ({}) as Node, callback);

		expect(() => stop()).not.toThrow();
		expect(callback).not.toHaveBeenCalled();
	});

	it('accepts a window-shaped getter without throwing', () => {
		const callback = vi.fn();
		const stop = onElementRemoval(() => window as never, callback);

		expect(() => stop()).not.toThrow();
		expect(callback).not.toHaveBeenCalled();
	});

	it('accepts a null target and a document option', () => {
		const callback = vi.fn();
		const stop = onElementRemoval(null, callback, { document: null });

		expect(() => stop()).not.toThrow();
		expect(callback).not.toHaveBeenCalled();
	});
});
