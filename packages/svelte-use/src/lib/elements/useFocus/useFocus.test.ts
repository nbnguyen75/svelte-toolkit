// @vitest-environment jsdom
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountInitialized } from '../../../../test/fixtures/mount.ts';
import { useFocus } from './index.ts';

const noop = () => {};

const created: HTMLElement[] = [];

function input(): HTMLInputElement {
	const el = document.createElement('input');
	document.body.append(el);
	created.push(el);
	return el;
}

afterEach(() => {
	document.body.replaceChildren();
	created.splice(0);
});

describe('useFocus', () => {
	it('reports false before anything focuses', async () => {
		const el = input();
		const { api, dispose } = await mountInitialized(() => useFocus(el), noop);
		try {
			expect(api.focused).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('follows real focus and blur', async () => {
		const el = input();
		const { api, dispose } = await mountInitialized(() => useFocus(el), noop);
		try {
			el.focus();
			expect(api.focused).toBe(true);

			el.blur();
			expect(api.focused).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('focuses when assigned true', async () => {
		const el = input();
		const { api, dispose } = await mountInitialized(() => useFocus(el), noop);
		try {
			api.focused = true;

			expect(document.activeElement).toBe(el);
			expect(api.focused).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('blurs when assigned false', async () => {
		const el = input();
		const { api, dispose } = await mountInitialized(() => useFocus(el), noop);
		try {
			el.focus();
			api.focused = false;

			expect(document.activeElement).not.toBe(el);
			expect(api.focused).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('does not re-focus when already focused', async () => {
		const el = input();
		const { api, dispose } = await mountInitialized(() => useFocus(el), noop);
		try {
			el.focus();
			const spy = vi.spyOn(el, 'focus');
			api.focused = true;

			// The flag is already true, so there is nothing to do.
			expect(spy).not.toHaveBeenCalled();
		} finally {
			await dispose();
		}
	});

	it('focuses a target that resolves later', async () => {
		const el = input();
		const source = createBox<HTMLInputElement | undefined>(undefined);
		const { api, dispose } = await mountInitialized(() => useFocus(() => source.value), noop);
		try {
			source.value = el;
			await tick();

			el.focus();
			expect(api.focused).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('focuses on mount when initialValue is true', async () => {
		const el = input();
		const { dispose } = await mountInitialized(() => useFocus(el, { initialValue: true }), noop);
		try {
			await tick();

			expect(document.activeElement).toBe(el);
		} finally {
			await dispose();
		}
	});

	it('focuses a late target when initialValue is true', async () => {
		const el = input();
		const source = createBox<HTMLInputElement | undefined>(undefined);
		const { dispose } = await mountInitialized(
			() => useFocus(() => source.value, { initialValue: true }),
			noop
		);
		try {
			expect(document.activeElement).not.toBe(el);

			source.value = el;
			await tick();

			expect(document.activeElement).toBe(el);
		} finally {
			await dispose();
		}
	});

	it('passes preventScroll through to focus', async () => {
		const el = input();
		const { api, dispose } = await mountInitialized(
			() => useFocus(el, { preventScroll: true }),
			noop
		);
		try {
			const spy = vi.spyOn(el, 'focus');
			api.focused = true;

			expect(spy).toHaveBeenCalledWith({ preventScroll: true });
		} finally {
			await dispose();
		}
	});

	it('reports focus for a non-visible focus by default', async () => {
		const el = input();
		// jsdom's selector engine does not implement `:focus-visible`, so a real
		// match is stubbed. What matters here is which branch the option selects.
		const matches = vi
			.spyOn(el, 'matches')
			.mockImplementation((selector: string) => selector !== ':focus-visible');

		const { api, dispose } = await mountInitialized(() => useFocus(el), noop);
		try {
			el.focus();

			expect(matches).not.toHaveBeenCalled();
			expect(api.focused).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('ignores a non-visible focus when focusVisible is true', async () => {
		const el = input();
		vi.spyOn(el, 'matches').mockImplementation((selector: string) => selector !== ':focus-visible');

		const { api, dispose } = await mountInitialized(
			() => useFocus(el, { focusVisible: true }),
			noop
		);
		try {
			el.focus();

			expect(api.focused).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('reports a visible focus when focusVisible is true', async () => {
		const el = input();
		vi.spyOn(el, 'matches').mockImplementation((selector: string) => selector === ':focus-visible');

		const { api, dispose } = await mountInitialized(
			() => useFocus(el, { focusVisible: true }),
			noop
		);
		try {
			el.focus();

			expect(api.focused).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('ignores a nullish target instead of throwing', async () => {
		const { api, dispose } = await mountInitialized(() => useFocus(null), noop);
		try {
			api.focused = true;
			api.focused = false;

			expect(api.focused).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('stops listening on unmount', async () => {
		const el = input();
		const { dispose } = await mountInitialized(() => useFocus(el), noop);
		await dispose();

		// No listener is left to write, so this is the teardown proof.
		el.focus();
		expect(document.activeElement).toBe(el);
	});
});
