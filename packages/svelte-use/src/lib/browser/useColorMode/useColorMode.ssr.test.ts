/**
 * SSR probe (node environment, no DOM): no selector can be resolved and no
 * attribute can be written, so the mode still reports its store/system/state
 * without touching a document.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useColorMode } from './index.ts';

describe('useColorMode (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('resolves auto to the light system default', () => {
		const mode = useColorMode({ storageKey: 'su-cm-ssr' });
		expect(mode.store).toBe('auto');
		expect(mode.system).toBe('light');
		expect(mode.state).toBe('light');
		expect(mode.value).toBe('light');
	});

	it('still honours an explicit initial value', () => {
		const mode = useColorMode({ initialValue: 'dark' });
		expect(mode.store).toBe('dark');
		expect(mode.state).toBe('dark');
	});

	it('assigns without persisting anywhere', () => {
		const mode = useColorMode({ storageKey: 'su-cm-ssr-assign' });
		mode.value = 'dark';
		expect(mode.store).toBe('dark');
		expect(mode.state).toBe('dark');
	});
});
