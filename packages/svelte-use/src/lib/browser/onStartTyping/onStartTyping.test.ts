// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mountSetup } from '../../../../test/fixtures/mount.ts';
import { isFocusedElementEditable, isTypedCharValid, onStartTyping } from './index.ts';

function mountListener(setup: () => void): Promise<{ dispose: () => Promise<void> }> {
	return mountSetup(setup);
}

function typed(init: KeyboardEventInit = {}): KeyboardEvent {
	return new KeyboardEvent('keydown', { key: 'a', ...init });
}

const created: HTMLElement[] = [];

function track<T extends HTMLElement>(tag: string): T {
	const el = document.createElement(tag) as T;
	document.body.append(el);
	created.push(el);
	return el;
}

afterEach(() => {
	for (const el of created.splice(0)) el.remove();
	document.body.focus();
});

describe('isTypedCharValid', () => {
	it('accepts a single printable character', () => {
		expect(isTypedCharValid(typed({ key: 'a' }))).toBe(true);
		expect(isTypedCharValid(typed({ key: 'Z' }))).toBe(true);
		expect(isTypedCharValid(typed({ key: '7' }))).toBe(true);
	});

	it('accepts punctuation that a keyCode range check would miss', () => {
		// VueUse's deprecated keyCode ranges reject these.
		expect(isTypedCharValid(typed({ key: '.' }))).toBe(true);
		expect(isTypedCharValid(typed({ key: '/' }))).toBe(true);
		expect(isTypedCharValid(typed({ key: '-' }))).toBe(true);
		expect(isTypedCharValid(typed({ key: ' ' }))).toBe(true);
	});

	it('rejects named keys', () => {
		expect(isTypedCharValid(typed({ key: 'Shift' }))).toBe(false);
		expect(isTypedCharValid(typed({ key: 'Enter' }))).toBe(false);
		expect(isTypedCharValid(typed({ key: 'ArrowUp' }))).toBe(false);
		expect(isTypedCharValid(typed({ key: 'Dead' }))).toBe(false);
	});

	it('rejects any modifier combination', () => {
		// Even when the key itself is printable, a modifier makes it a shortcut.
		expect(isTypedCharValid(typed({ key: 'k', metaKey: true }))).toBe(false);
		expect(isTypedCharValid(typed({ key: 'c', ctrlKey: true }))).toBe(false);
		expect(isTypedCharValid(typed({ key: '1', altKey: true }))).toBe(false);
	});

	it('allows shift, which does not make a key a shortcut', () => {
		expect(isTypedCharValid(typed({ key: 'A', shiftKey: true }))).toBe(true);
	});
});

describe('isFocusedElementEditable', () => {
	it('is false when nothing is focused', () => {
		expect(isFocusedElementEditable()).toBe(false);
	});

	it('is false when the body has focus', () => {
		document.body.focus();
		expect(isFocusedElementEditable()).toBe(false);
	});

	it('is true for a focused input', () => {
		const el = track<HTMLInputElement>('input');
		el.focus();
		expect(isFocusedElementEditable()).toBe(true);
	});

	it('is true for a focused textarea', () => {
		const el = track<HTMLTextAreaElement>('textarea');
		el.focus();
		expect(isFocusedElementEditable()).toBe(true);
	});

	it('is true for a focused contenteditable element', () => {
		const el = track('div');
		el.setAttribute('contenteditable', 'true');
		el.focus();
		expect(isFocusedElementEditable()).toBe(true);
	});

	it('is true for contenteditable="false", which is still editable markup', () => {
		const el = track('div');
		el.setAttribute('contenteditable', 'false');
		el.focus();
		expect(isFocusedElementEditable()).toBe(true);
	});

	it('is false for a focused plain element', () => {
		const el = track('div');
		el.focus();
		expect(isFocusedElementEditable()).toBe(false);
	});
});

describe('onStartTyping', () => {
	it('fires for a printable character', async () => {
		const callback = vi.fn();
		const { dispose } = await mountListener(() => {
			onStartTyping(callback);
		});
		try {
			document.dispatchEvent(typed());
			expect(callback).toHaveBeenCalledTimes(1);
			expect(callback.mock.calls[0]?.[0].key).toBe('a');
		} finally {
			await dispose();
		}
	});

	it('does not fire for a modifier shortcut', async () => {
		const callback = vi.fn();
		const { dispose } = await mountListener(() => {
			onStartTyping(callback);
		});
		try {
			document.dispatchEvent(typed({ key: 'k', metaKey: true }));
			document.dispatchEvent(typed({ key: 'Enter' }));
			expect(callback).not.toHaveBeenCalled();
		} finally {
			await dispose();
		}
	});

	it('does not fire while an input is focused', async () => {
		const el = track<HTMLInputElement>('input');
		el.focus();
		const callback = vi.fn();
		const { dispose } = await mountListener(() => {
			onStartTyping(callback);
		});
		try {
			document.dispatchEvent(typed());
			expect(callback).not.toHaveBeenCalled();
		} finally {
			await dispose();
		}
	});

	it('does not fire while a textarea is focused', async () => {
		const el = track<HTMLTextAreaElement>('textarea');
		el.focus();
		const callback = vi.fn();
		const { dispose } = await mountListener(() => {
			onStartTyping(callback);
		});
		try {
			document.dispatchEvent(typed());
			expect(callback).not.toHaveBeenCalled();
		} finally {
			await dispose();
		}
	});

	it('does not fire while a contenteditable element is focused', async () => {
		const el = track('div');
		el.setAttribute('contenteditable', 'true');
		el.focus();
		const callback = vi.fn();
		const { dispose } = await mountListener(() => {
			onStartTyping(callback);
		});
		try {
			document.dispatchEvent(typed());
			expect(callback).not.toHaveBeenCalled();
		} finally {
			await dispose();
		}
	});

	it('fires again once focus leaves the field', async () => {
		const el = track<HTMLInputElement>('input');
		el.focus();
		const callback = vi.fn();
		const { dispose } = await mountListener(() => {
			onStartTyping(callback);
		});
		try {
			document.dispatchEvent(typed());
			expect(callback).not.toHaveBeenCalled();

			el.blur();
			document.dispatchEvent(typed());
			expect(callback).toHaveBeenCalledTimes(1);
		} finally {
			await dispose();
		}
	});

	it('honours a custom isTypedCharValid', async () => {
		const callback = vi.fn();
		const { dispose } = await mountListener(() => {
			onStartTyping(callback, { isTypedCharValid: (event) => event.key === 'Enter' });
		});
		try {
			document.dispatchEvent(typed());
			expect(callback).not.toHaveBeenCalled();

			document.dispatchEvent(typed({ key: 'Enter' }));
			expect(callback).toHaveBeenCalledTimes(1);
		} finally {
			await dispose();
		}
	});

	it('honours a custom isFocusedElementEditable', async () => {
		const callback = vi.fn();
		const { dispose } = await mountListener(() => {
			onStartTyping(callback, { isFocusedElementEditable: () => true });
		});
		try {
			document.dispatchEvent(typed());
			expect(callback).not.toHaveBeenCalled();
		} finally {
			await dispose();
		}
	});

	it('listens on a custom document', async () => {
		const other = document.implementation.createHTMLDocument('other');
		const callback = vi.fn();
		const { dispose } = await mountListener(() => {
			onStartTyping(callback, { document: () => other });
		});
		try {
			document.dispatchEvent(typed());
			expect(callback).not.toHaveBeenCalled();

			other.dispatchEvent(typed());
			expect(callback).toHaveBeenCalledTimes(1);
		} finally {
			await dispose();
		}
	});

	it('attaches nothing for a null document', async () => {
		const callback = vi.fn();
		const { dispose } = await mountListener(() => {
			onStartTyping(callback, { document: null });
		});
		try {
			document.dispatchEvent(typed());
			expect(callback).not.toHaveBeenCalled();
		} finally {
			await dispose();
		}
	});

	it('stops listening after unmount', async () => {
		const callback = vi.fn();
		const { dispose } = await mountListener(() => {
			onStartTyping(callback);
		});
		await dispose();
		document.dispatchEvent(typed());
		expect(callback).not.toHaveBeenCalled();
	});

	it('returns undefined, cleanup being automatic', async () => {
		let returned: unknown = 'not called';
		const { dispose } = await mountListener(() => {
			returned = onStartTyping(vi.fn());
		});
		try {
			expect(returned).toBeUndefined();
		} finally {
			await dispose();
		}
	});
});
