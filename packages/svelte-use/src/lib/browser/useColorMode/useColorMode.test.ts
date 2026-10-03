// @vitest-environment jsdom
import { tick } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mountUtil } from '../../../../test/fixtures/mount.ts';
import { mediaListenerCount, setMediaMatches } from '../../../../test/setup.ts';
import type { UseColorModeOptions } from './index.ts';
import { useColorMode } from './index.ts';

const MEDIA_QUERY = '(prefers-color-scheme: dark)';

beforeEach(() => {
	window.localStorage.clear();
	document.documentElement.className = '';
	document.documentElement.removeAttribute('data-theme');
	document.documentElement.removeAttribute('style');
});

const mountMode = (opts?: UseColorModeOptions) => mountUtil(() => useColorMode(opts));

describe('useColorMode', () => {
	it('follows the OS preference in auto mode', async () => {
		const { api, dispose } = await mountMode({ storageKey: 'su-cm-auto' });
		try {
			expect(api.store).toBe('auto');
			expect(api.system).toBe('light');
			expect(api.state).toBe('light');
			expect(api.value).toBe('light');
			expect(document.documentElement.classList.contains('light')).toBe(true);

			setMediaMatches(MEDIA_QUERY, true);
			await tick();
			expect(api.system).toBe('dark');
			expect(api.state).toBe('dark');
			// The *store* is untouched: `auto` is still what was chosen.
			expect(api.store).toBe('auto');
			expect(document.documentElement.classList.contains('dark')).toBe(true);
			expect(document.documentElement.classList.contains('light')).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('persists an explicit choice and ignores the OS afterwards', async () => {
		const key = 'su-cm-explicit';
		const { api, dispose } = await mountMode({ storageKey: key });
		try {
			api.value = 'dark';
			await tick();
			expect(api.store).toBe('dark');
			expect(api.state).toBe('dark');
			expect(window.localStorage.getItem(key)).toBe('dark');

			setMediaMatches(MEDIA_QUERY, false);
			await tick();
			expect(api.state).toBe('dark');
		} finally {
			await dispose();
		}
	});

	it('restores the persisted mode', async () => {
		window.localStorage.setItem('su-cm-restore', 'dark');
		const { api, dispose } = await mountMode({ storageKey: 'su-cm-restore' });
		try {
			expect(api.store).toBe('dark');
			expect(api.state).toBe('dark');
		} finally {
			await dispose();
		}
	});

	it('leaves unrelated classes alone when diffing mode classes', async () => {
		document.documentElement.className = 'app-shell theme-dark';
		const { api, dispose } = await mountMode({ storageKey: 'su-cm-classes' });
		try {
			// The 'theme-dark' class is not a mode class, so it must survive.
			api.value = 'dark';
			await tick();
			expect(document.documentElement.classList.contains('app-shell')).toBe(true);
			expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
			expect(document.documentElement.classList.contains('dark')).toBe(true);
			expect(document.documentElement.classList.contains('light')).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('applies custom mode names', async () => {
		const { api, dispose } = await mountMode({
			storageKey: 'su-cm-modes',
			modes: { dark: 'night' }
		});
		try {
			api.value = 'dark';
			await tick();
			expect(document.documentElement.classList.contains('night')).toBe(true);
			expect(document.documentElement.classList.contains('dark')).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('supports multi-class mode values', async () => {
		const { api, dispose } = await mountMode({
			storageKey: 'su-cm-multi',
			modes: { dark: 'night dark' }
		});
		try {
			api.value = 'dark';
			await tick();
			expect(document.documentElement.classList.contains('night')).toBe(true);
			expect(document.documentElement.classList.contains('dark')).toBe(true);

			api.value = 'light';
			await tick();
			expect(document.documentElement.classList.contains('night')).toBe(false);
			expect(document.documentElement.classList.contains('dark')).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('falls through to the raw mode name for an unmapped mode', async () => {
		const { api, dispose } = await mountMode({
			storageKey: 'su-cm-unmapped',
			initialValue: 'sepia'
		});
		try {
			expect(api.value).toBe('sepia');
			// `sepia` has no `modes` entry, so it falls through to the raw mode
			// name - which matches no declared mode class, so nothing is added.
			expect(document.documentElement.className).toBe('');
		} finally {
			await dispose();
		}
	});

	it('writes the whole value to a non-class attribute', async () => {
		const { api, dispose } = await mountMode({
			storageKey: 'su-cm-attr',
			attribute: 'data-theme'
		});
		try {
			expect(document.documentElement.getAttribute('data-theme')).toBe('light');
			expect(document.documentElement.classList.contains('light')).toBe(false);

			api.value = 'dark';
			await tick();
			expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
		} finally {
			await dispose();
		}
	});

	it('targets a custom selector', async () => {
		const host = document.createElement('div');
		host.id = 'su-cm-host';
		document.body.appendChild(host);
		const { api, dispose } = await mountMode({ storageKey: 'su-cm-sel', selector: '#su-cm-host' });
		try {
			api.value = 'dark';
			await tick();
			expect(host.classList.contains('dark')).toBe(true);
			expect(document.documentElement.classList.contains('dark')).toBe(false);
		} finally {
			await dispose();
			host.remove();
		}
	});

	it('lets onChanged take over the DOM write', async () => {
		const onChanged = vi.fn((_mode, defaultHandler) => {
			// Deliberately does not call `defaultHandler`.
		});
		const { api, dispose } = await mountMode({ storageKey: 'su-cm-hook', onChanged });
		try {
			api.value = 'dark';
			await tick();
			expect(onChanged).toHaveBeenCalledWith('dark', expect.any(Function));
			expect(document.documentElement.classList.contains('dark')).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('lets onChanged delegate to the default handler', async () => {
		const onChanged = vi.fn((_mode, defaultHandler) => {
			defaultHandler('dark');
		});
		const { api, dispose } = await mountMode({ storageKey: 'su-cm-hook2', onChanged });
		try {
			api.value = 'light';
			await tick();
			expect(onChanged).toHaveBeenCalled();
			expect(document.documentElement.classList.contains('dark')).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('injects and removes the transition block by default', async () => {
		const { api, dispose } = await mountMode({ storageKey: 'su-cm-trans' });
		try {
			const before = document.head.querySelectorAll('style').length;
			api.value = 'dark';
			await tick();
			// The block must be gone again: leaving it behind would disable
			// transitions for the rest of the session.
			expect(document.head.querySelectorAll('style').length).toBe(before);
		} finally {
			await dispose();
		}
	});

	it('skips the transition block when disableTransition is false', async () => {
		const append = vi.spyOn(document.head, 'appendChild');
		const { api, dispose } = await mountMode({
			storageKey: 'su-cm-notrans',
			disableTransition: false
		});
		try {
			api.value = 'dark';
			await tick();
			expect(append).not.toHaveBeenCalled();
			expect(document.documentElement.classList.contains('dark')).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('keeps the mode in memory when storageKey is null', async () => {
		const { api, dispose } = await mountMode({ storageKey: null });
		try {
			api.value = 'dark';
			await tick();
			expect(api.store).toBe('dark');
			expect(window.localStorage.length).toBe(0);
		} finally {
			await dispose();
		}
	});

	it('persists through a caller-supplied cell', async () => {
		const backing = await mountUtil(() => useColorMode({ storageKey: 'su-cm-src' }));
		const consumer = await mountUtil(() => useColorMode({ storageRef: backing.api }));
		try {
			consumer.api.value = 'dark';
			await tick();
			expect(backing.api.store).toBe('dark');
			expect(window.localStorage.getItem('su-cm-src')).toBe('dark');
		} finally {
			await consumer.dispose();
			await backing.dispose();
		}
	});

	it('releases the media query on unmount', async () => {
		const before = mediaListenerCount();
		const { dispose } = await mountMode({ storageKey: 'su-cm-leak' });
		expect(mediaListenerCount()).toBe(before + 1);
		await dispose();
		expect(mediaListenerCount()).toBe(before);
	});

	it('stops reacting to OS changes after unmount', async () => {
		setMediaMatches(MEDIA_QUERY, true);
		const { api, dispose } = await mountMode({ storageKey: 'su-cm-gone' });
		expect(api.value).toBe('dark');
		await dispose();
		setMediaMatches(MEDIA_QUERY, false);
		await tick();
		expect(api.value).toBe('dark');
	});
});
