// @vitest-environment jsdom
import { tick } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';

import { mountInitialized } from '../../../../test/fixtures/mount.ts';
import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { useStyleTag } from './index.ts';

const noop = () => {};

/** Elements this util injected, so a failing case cannot leak into the next. */
const injected = (): HTMLStyleElement[] => [
	...document.head.querySelectorAll('style[id^="svelte-use-styletag-"]')
];

afterEach(() => {
	for (const el of injected()) el.remove();
});

describe('useStyleTag', () => {
	it('injects a style element on mount and fills it', async () => {
		const { api, dispose } = await mountInitialized(
			() => useStyleTag('body { color: red }', { id: 'su-style-basic' }),
			noop
		);
		try {
			const el = document.getElementById('su-style-basic');
			expect(el).toBeInstanceOf(HTMLStyleElement);
			expect(el?.textContent).toBe('body { color: red }');
			expect(api.isLoaded).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('generates a unique id when none is given', async () => {
		const first = await mountInitialized(() => useStyleTag('a{}'), noop);
		const second = await mountInitialized(() => useStyleTag('b{}'), noop);
		try {
			expect(first.api.id).not.toBe(second.api.id);
			expect(document.getElementById(first.api.id)).not.toBeNull();
			expect(document.getElementById(second.api.id)).not.toBeNull();
		} finally {
			await first.dispose();
			await second.dispose();
		}
	});

	it('mirrors a getter source', async () => {
		const css = createBox('a { color: red }');
		const { dispose } = await mountInitialized(
			() => useStyleTag(() => css.value, { id: 'su-style-reactive' }),
			noop
		);
		try {
			expect(document.getElementById('su-style-reactive')?.textContent).toBe('a { color: red }');

			css.value = 'a { color: blue }';
			await tick();

			expect(document.getElementById('su-style-reactive')?.textContent).toBe('a { color: blue }');
		} finally {
			await dispose();
		}
	});

	it('removes the element on unmount', async () => {
		const { dispose } = await mountInitialized(
			() => useStyleTag('a{}', { id: 'su-style-unmount' }),
			noop
		);
		expect(document.getElementById('su-style-unmount')).not.toBeNull();

		await dispose();
		expect(document.getElementById('su-style-unmount')).toBeNull();
	});

	it('adopts an existing element carrying the same id instead of duplicating it', async () => {
		const existing = document.createElement('style');
		existing.id = 'su-style-shared';
		existing.textContent = 'pre-existing';
		document.head.appendChild(existing);

		const { api, dispose } = await mountInitialized(
			() => useStyleTag('from util', { id: 'su-style-shared' }),
			noop
		);
		try {
			expect(document.querySelectorAll('#su-style-shared')).toHaveLength(1);
			expect(existing.textContent).toBe('from util');
			expect(api.isLoaded).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('writes media and nonce onto the element', async () => {
		const { dispose } = await mountInitialized(
			() =>
				useStyleTag('a{}', {
					id: 'su-style-attrs',
					media: 'print',
					nonce: 'n0nce'
				}),
			noop
		);
		try {
			const el = document.getElementById('su-style-attrs');
			expect(el?.getAttribute('media')).toBe('print');
			// jsdom reflects `nonce` through the attribute.
			expect(el?.getAttribute('nonce')).toBe('n0nce');
		} finally {
			await dispose();
		}
	});

	describe('manual', () => {
		it('injects nothing on mount', async () => {
			const { api, dispose } = await mountInitialized(
				() => useStyleTag('a{}', { id: 'su-style-manual', manual: true }),
				noop
			);
			try {
				expect(api.isLoaded).toBe(false);
				expect(document.getElementById('su-style-manual')).toBeNull();

				api.load();
				await tick();

				expect(api.isLoaded).toBe(true);
				expect(document.getElementById('su-style-manual')?.textContent).toBe('a{}');
			} finally {
				await dispose();
			}
		});

		it('survives unmount in manual mode, and unloads on request', async () => {
			const { api, dispose } = await mountInitialized(
				() => useStyleTag('a{}', { id: 'su-style-manual-keep', manual: true }),
				noop
			);
			api.load();
			await tick();

			await dispose();
			// `manual` means the caller owns the lifetime.
			expect(document.getElementById('su-style-manual-keep')).not.toBeNull();

			api.unload();
			expect(document.getElementById('su-style-manual-keep')).toBeNull();
			expect(api.isLoaded).toBe(false);
		});

		it('lands the current CSS on a late load, not the value at init', async () => {
			const css = createBox('a { color: red }');
			const { api, dispose } = await mountInitialized(
				() => useStyleTag(() => css.value, { id: 'su-style-late', manual: true }),
				noop
			);
			try {
				css.value = 'a { color: green }';
				await tick();

				api.load();
				await tick();

				// The trap: loading before the first mirroring run would leave the
				// element empty until something else invalidated the effect.
				expect(document.getElementById('su-style-late')?.textContent).toBe('a { color: green }');
			} finally {
				await dispose();
			}
		});
	});

	describe('immediate: false', () => {
		it('stays unloaded until load is called', async () => {
			const { api, dispose } = await mountInitialized(
				() => useStyleTag('a{}', { id: 'su-style-lazy', immediate: false }),
				noop
			);
			try {
				expect(api.isLoaded).toBe(false);
				expect(document.getElementById('su-style-lazy')).toBeNull();

				api.load();
				await tick();
				expect(api.isLoaded).toBe(true);
			} finally {
				await dispose();
			}
		});
	});

	it('ignores a second load', async () => {
		const { api, dispose } = await mountInitialized(
			() => useStyleTag('a{}', { id: 'su-style-twice' }),
			noop
		);
		try {
			api.load();
			await tick();
			expect(document.querySelectorAll('#su-style-twice')).toHaveLength(1);
		} finally {
			await dispose();
		}
	});

	it('writes through the css setter', async () => {
		const { api, dispose } = await mountInitialized(
			() => useStyleTag('a{}', { id: 'su-style-write' }),
			noop
		);
		try {
			api.css = 'b { color: blue }';
			expect(api.css).toBe('b { color: blue }');
			expect(document.getElementById('su-style-write')?.textContent).toBe('b { color: blue }');
		} finally {
			await dispose();
		}
	});

	it('keeps the getter honest when the source is reactive', async () => {
		const css = createBox('a{}');
		const { api, dispose } = await mountInitialized(
			() => useStyleTag(() => css.value, { id: 'su-style-honest' }),
			noop
		);
		try {
			css.value = 'b{}';
			await tick();
			expect(api.css).toBe('b{}');
		} finally {
			await dispose();
		}
	});

	it('is a no-op to unload when nothing is loaded', async () => {
		const { api, dispose } = await mountInitialized(
			() => useStyleTag('a{}', { id: 'su-style-noop', manual: true }),
			noop
		);
		try {
			api.unload();
			expect(api.isLoaded).toBe(false);
		} finally {
			await dispose();
		}
	});
});
