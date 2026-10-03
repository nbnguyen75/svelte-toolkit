// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

import { mountUtil } from '../../../../test/fixtures/mount.ts';
import { useKeyModifier } from './index.ts';

function keyboard(init: KeyboardEventInit, type = 'keydown'): KeyboardEvent {
	return new KeyboardEvent(type, init);
}

describe('useKeyModifier', () => {
	describe('value', () => {
		it('starts as null before any event', async () => {
			const { api, dispose } = await mountUtil(() => useKeyModifier('Shift'));
			try {
				expect(api.value).toBeNull();
			} finally {
				await dispose();
			}
		});

		it('honours an initial value', async () => {
			const { api, dispose } = await mountUtil(() => useKeyModifier('Shift', { initial: true }));
			try {
				expect(api.value).toBe(true);
			} finally {
				await dispose();
			}
		});

		it('honours an explicit initial false', async () => {
			const { api, dispose } = await mountUtil(() => useKeyModifier('Shift', { initial: false }));
			try {
				expect(api.value).toBe(false);
			} finally {
				await dispose();
			}
		});

		it('reports true while held and false after release', async () => {
			const { api, dispose } = await mountUtil(() => useKeyModifier('Shift'));
			try {
				document.dispatchEvent(keyboard({ key: 'Shift', shiftKey: true }));
				expect(api.value).toBe(true);

				document.dispatchEvent(keyboard({ key: 'Shift' }, 'keyup'));
				expect(api.value).toBe(false);
			} finally {
				await dispose();
			}
		});

		it('ignores the modifier state of a different key', async () => {
			const { api, dispose } = await mountUtil(() => useKeyModifier('Shift'));
			try {
				document.dispatchEvent(keyboard({ key: 'a', ctrlKey: true }));
				expect(api.value).toBe(false);
			} finally {
				await dispose();
			}
		});
	});

	describe('modifiers', () => {
		it.each(['Alt', 'Control', 'Meta', 'Shift'] as const)('tracks %s', async (modifier) => {
			const init: KeyboardEventInit = {};
			// jsdom derives getModifierState from the matching flag.
			if (modifier === 'Alt') init.altKey = true;
			if (modifier === 'Control') init.ctrlKey = true;
			if (modifier === 'Meta') init.metaKey = true;
			if (modifier === 'Shift') init.shiftKey = true;

			const { api, dispose } = await mountUtil(() => useKeyModifier(modifier));
			try {
				document.dispatchEvent(keyboard({ key: modifier, ...init }));
				expect(api.value).toBe(true);
			} finally {
				await dispose();
			}
		});

		it('reads the state from mouse events too', async () => {
			const { api, dispose } = await mountUtil(() => useKeyModifier('Shift'));
			try {
				document.dispatchEvent(new MouseEvent('mousedown', { shiftKey: true }));
				expect(api.value).toBe(true);

				document.dispatchEvent(new MouseEvent('mouseup'));
				expect(api.value).toBe(false);
			} finally {
				await dispose();
			}
		});

		it('accepts the lock and function modifiers jsdom does not model', async () => {
			const { api, dispose } = await mountUtil(() => useKeyModifier('CapsLock'));
			try {
				document.dispatchEvent(keyboard({ key: 'CapsLock' }));
				// jsdom reports an unmodelled modifier as not pressed; the point is
				// that the name reaches getModifierState without throwing.
				expect(api.value).toBe(false);
			} finally {
				await dispose();
			}
		});
	});

	describe('events option', () => {
		it('listens only on the configured events', async () => {
			const { api, dispose } = await mountUtil(() =>
				useKeyModifier('Shift', { events: ['keyup'] })
			);
			try {
				document.dispatchEvent(keyboard({ key: 'Shift', shiftKey: true }));
				// keydown is no longer listened to, so state is untouched.
				expect(api.value).toBeNull();

				document.dispatchEvent(keyboard({ key: 'Shift', shiftKey: true }, 'keyup'));
				expect(api.value).toBe(true);
			} finally {
				await dispose();
			}
		});

		it('listens on a single custom event', async () => {
			const { api, dispose } = await mountUtil(() =>
				useKeyModifier('Shift', { events: ['mousemove'] })
			);
			try {
				document.dispatchEvent(new MouseEvent('mousemove', { shiftKey: true }));
				expect(api.value).toBe(true);
			} finally {
				await dispose();
			}
		});

		it('detaches every configured listener on unmount', async () => {
			const spy = vi.spyOn(document, 'removeEventListener');
			const { dispose } = await mountUtil(() =>
				useKeyModifier('Shift', { events: ['keydown', 'keyup', 'mousedown'] })
			);
			await dispose();
			expect(spy.mock.calls.map((call) => call[0])).toEqual(
				expect.arrayContaining(['keydown', 'keyup', 'mousedown'])
			);
			spy.mockRestore();
		});
	});

	describe('document option', () => {
		it('listens on a custom document', async () => {
			const other = document.implementation.createHTMLDocument('other');
			const { api, dispose } = await mountUtil(() =>
				useKeyModifier('Shift', { document: () => other })
			);
			try {
				document.dispatchEvent(keyboard({ key: 'Shift', shiftKey: true }));
				expect(api.value).toBeNull();

				other.dispatchEvent(keyboard({ key: 'Shift', shiftKey: true }));
				expect(api.value).toBe(true);
			} finally {
				await dispose();
			}
		});

		it('attaches nothing for a null document', async () => {
			const { api, dispose } = await mountUtil(() => useKeyModifier('Shift', { document: null }));
			try {
				document.dispatchEvent(keyboard({ key: 'Shift', shiftKey: true }));
				expect(api.value).toBeNull();
			} finally {
				await dispose();
			}
		});
	});

	describe('robustness', () => {
		it('ignores an event without getModifierState', async () => {
			const { api, dispose } = await mountUtil(() => useKeyModifier('Shift'));
			try {
				document.dispatchEvent(keyboard({ key: 'Shift', shiftKey: true }));
				expect(api.value).toBe(true);

				document.dispatchEvent(new Event('keydown'));
				// State is left as-is rather than clobbered by a bad read.
				expect(api.value).toBe(true);
			} finally {
				await dispose();
			}
		});

		it('stops updating after unmount', async () => {
			const { api, dispose } = await mountUtil(() => useKeyModifier('Shift'));
			await dispose();
			document.dispatchEvent(keyboard({ key: 'Shift', shiftKey: true }));
			expect(api.value).toBeNull();
		});

		it('survives destructuring, since value is a getter', async () => {
			const { dispose } = await mountUtil(() => {
				const { value } = useKeyModifier('Shift');
				expect(value).toBeNull();
				return () => {
					expect(value).toBe(true);
				};
			});
			await dispose();
		});
	});
});
