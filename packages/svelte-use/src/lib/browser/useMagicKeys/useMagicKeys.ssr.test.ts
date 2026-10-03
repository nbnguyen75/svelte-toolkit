/**
 * SSR probe (node environment, no DOM): the listeners must attach to nothing,
 * and every key must read as not pressed with an empty `current`.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { useMagicKeys } from './index.ts';

describe('useMagicKeys (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('reads every key as unpressed', () => {
		const magic = useMagicKeys();
		expect(magic.a).toBe(false);
		expect(magic.ctrl_k).toBe(false);
		expect(magic.current.size).toBe(0);
	});

	it('attaches nothing and does not throw', () => {
		expect(() => useMagicKeys()).not.toThrow();
	});
});
