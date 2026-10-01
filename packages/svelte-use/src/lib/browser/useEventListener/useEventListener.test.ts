// @vitest-environment jsdom
import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountSetup } from '../../../../test/fixtures/mount.ts';
import { useEventListener } from './index.ts';

describe('useEventListener', () => {
	it('calls the handler on window events', async () => {
		const handler = vi.fn();
		const { dispose } = await mountSetup(() => useEventListener(() => window, 'click', handler));
		try {
			window.dispatchEvent(new window.MouseEvent('click'));
			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler.mock.calls[0]?.[0]).toBeInstanceOf(window.MouseEvent);
		} finally {
			await dispose();
		}
	});

	it('removes the listener on unmount', async () => {
		const handler = vi.fn();
		const remove = vi.spyOn(window, 'removeEventListener');
		const { dispose } = await mountSetup(() => useEventListener(() => window, 'click', handler));
		window.dispatchEvent(new window.MouseEvent('click'));
		expect(handler).toHaveBeenCalledTimes(1);
		await dispose();
		expect(remove).toHaveBeenCalledWith('click', handler, undefined);
		window.dispatchEvent(new window.MouseEvent('click'));
		expect(handler).toHaveBeenCalledTimes(1);
		remove.mockRestore();
	});

	it('supports element targets and listener options', async () => {
		const handler = vi.fn();
		const button = document.createElement('button');
		document.body.appendChild(button);
		const { dispose } = await mountSetup(() =>
			useEventListener(() => button, 'click', handler, { once: true })
		);
		try {
			button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
			button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
			expect(handler).toHaveBeenCalledTimes(1);
		} finally {
			await dispose();
			button.remove();
		}
	});

	it('is a safe no-op for nullish targets', async () => {
		const handler = vi.fn();
		const { dispose } = await mountSetup(() => useEventListener(() => null, 'click', handler));
		try {
			window.dispatchEvent(new window.MouseEvent('click'));
			expect(handler).not.toHaveBeenCalled();
		} finally {
			await dispose();
		}
	});

	it('listens on document targets', async () => {
		const handler = vi.fn();
		const { dispose } = await mountSetup(() =>
			useEventListener(() => document, 'keydown', handler)
		);
		try {
			document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'a' }));
			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler.mock.calls[0]?.[0]).toBeInstanceOf(window.KeyboardEvent);
		} finally {
			await dispose();
		}
	});

	it('listens on generic event targets', async () => {
		const handler = vi.fn();
		const target = new EventTarget();
		const { dispose } = await mountSetup(() => useEventListener(() => target, 'ping', handler));
		try {
			target.dispatchEvent(new Event('ping'));
			expect(handler).toHaveBeenCalledTimes(1);
		} finally {
			await dispose();
		}
	});

	it('re-attaches when a getter target resolves to a new element', async () => {
		const first = vi.fn();
		const second = vi.fn();
		const target = createBox<HTMLElement | null>(null);
		const button = document.createElement('button');

		const { dispose } = await mountSetup(() =>
			useEventListener(() => target.value, 'click', second)
		);
		try {
			// nullish target: nothing bound yet
			target.value = button;
			await tick();
			button.dispatchEvent(new window.MouseEvent('click'));
			expect(second).toHaveBeenCalledTimes(1);

			// swapping targets detaches from the old element and binds the new one
			const other = document.createElement('button');
			target.value = other;
			await tick();
			button.dispatchEvent(new window.MouseEvent('click'));
			expect(second).toHaveBeenCalledTimes(1);
			other.dispatchEvent(new window.MouseEvent('click'));
			expect(second).toHaveBeenCalledTimes(2);
			expect(first).not.toHaveBeenCalled();
		} finally {
			await dispose();
			button.remove();
		}
	});
});
