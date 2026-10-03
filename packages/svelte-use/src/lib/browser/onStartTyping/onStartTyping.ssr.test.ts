/**
 * SSR probe (node environment, no DOM): the listeners must attach to nothing
 * rather than throw on a missing `window`, and `isFocusedElementEditable` has no
 * `document` to read `activeElement` from.
 */
import { describe, expect, it } from 'vitest';

import { isBrowser } from '../../shared/is.ts';
import { isFocusedElementEditable, onStartTyping } from './index.ts';

describe('onStartTyping (ssr)', () => {
	it('reports a non-browser environment', () => {
		expect(isBrowser).toBe(false);
	});

	it('reports no editable focus without a document', () => {
		expect(isFocusedElementEditable()).toBe(false);
	});

	it('attaches nothing and does not throw', () => {
		expect(() => onStartTyping(() => {})).not.toThrow();
	});
});
