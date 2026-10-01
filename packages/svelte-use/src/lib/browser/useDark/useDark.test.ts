// @vitest-environment jsdom
import { tick } from 'svelte';
import { beforeEach, describe, expect, it } from 'vitest';

import { mountUtil } from '../../../../test/fixtures/mount.ts';
import { setMediaMatches } from '../../../../test/setup.ts';
import type { UseDarkOptions } from './index.ts';
import { useDark } from './index.ts';

const MEDIA_QUERY = '(prefers-color-scheme: dark)';

beforeEach(() => {
	window.localStorage.clear();
	document.documentElement.classList.remove('dark');
	document.documentElement.removeAttribute('data-theme');
});

const mountDark = (opts?: UseDarkOptions) => mountUtil(() => useDark(opts));

describe('useDark', () => {
	it('defaults to light with empty storage and light OS preference', async () => {
		const { api, dispose } = await mountDark({ storageKey: 'su-dark-default' });
		try {
			expect(api.value).toBe(false);
			expect(document.documentElement.classList.contains('dark')).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('follows a dark OS preference in auto mode', async () => {
		setMediaMatches(MEDIA_QUERY, true);
		const { api, dispose } = await mountDark({ storageKey: 'su-dark-os' });
		try {
			expect(api.value).toBe(true);
			expect(document.documentElement.classList.contains('dark')).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('reacts to OS preference changes while in auto mode', async () => {
		const { api, dispose } = await mountDark({ storageKey: 'su-dark-live' });
		try {
			expect(api.value).toBe(false);
			setMediaMatches(MEDIA_QUERY, true);
			await tick();
			expect(api.value).toBe(true);
			expect(document.documentElement.classList.contains('dark')).toBe(true);
			setMediaMatches(MEDIA_QUERY, false);
			await tick();
			expect(api.value).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('toggle persists explicit light/dark and ignores OS changes after', async () => {
		const key = 'su-dark-toggle';
		const { api, dispose } = await mountDark({ storageKey: key });
		try {
			api.toggle();
			await tick();
			expect(api.value).toBe(true);
			expect(window.localStorage.getItem(key)).toBe('dark');
			setMediaMatches(MEDIA_QUERY, false);
			await tick();
			expect(api.value).toBe(true);
			api.toggle();
			await tick();
			expect(api.value).toBe(false);
			expect(window.localStorage.getItem(key)).toBe('light');
		} finally {
			await dispose();
		}
	});

	it('setMode switches modes and auto returns to OS-driven', async () => {
		const key = 'su-dark-mode';
		const { api, dispose } = await mountDark({ storageKey: key });
		try {
			api.setMode('dark');
			await tick();
			expect(api.value).toBe(true);
			api.setMode('light');
			await tick();
			expect(api.value).toBe(false);
			setMediaMatches(MEDIA_QUERY, true);
			await tick();
			expect(api.value).toBe(false);
			api.setMode('auto');
			await tick();
			expect(api.value).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('restores the persisted mode on mount', async () => {
		const key = 'su-dark-restore';
		window.localStorage.setItem(key, 'dark');
		const { api, dispose } = await mountDark({ storageKey: key });
		try {
			expect(api.value).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('writes a custom attribute instead of the dark class', async () => {
		const { api, dispose } = await mountDark({
			attribute: 'data-theme',
			storageKey: 'su-dark-attr'
		});
		try {
			expect(document.documentElement.getAttribute('data-theme')).toBe('light');
			api.toggle();
			await tick();
			expect(api.value).toBe(true);
			expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
			expect(document.documentElement.classList.contains('dark')).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('stops reacting to OS changes after unmount', async () => {
		setMediaMatches(MEDIA_QUERY, true);
		const { api, dispose } = await mountDark({ storageKey: 'su-dark-dispose' });
		expect(api.value).toBe(true);
		await dispose();
		setMediaMatches(MEDIA_QUERY, false);
		await tick();
		expect(api.value).toBe(true);
	});

	it('targets a custom selector', async () => {
		const host = document.createElement('div');
		host.id = 'su-dark-host';
		document.body.appendChild(host);
		const { api, dispose } = await mountDark({
			selector: '#su-dark-host',
			storageKey: 'su-dark-selector'
		});
		try {
			api.setMode('dark');
			await tick();
			expect(host.classList.contains('dark')).toBe(true);
			expect(document.documentElement.classList.contains('dark')).toBe(false);
		} finally {
			await dispose();
			host.remove();
		}
	});
});
