// @vitest-environment jsdom
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mountUtil } from '../../../../test/fixtures/mount.ts';
import type { UsePreferredLanguagesReturn } from './index.ts';
import { usePreferredLanguages } from './index.ts';

/** Swap `navigator.languages` for the duration of one test. */
function setLanguages(languages: string[]) {
	Object.defineProperty(window.navigator, 'languages', {
		configurable: true,
		value: languages
	});
}

const original = window.navigator.languages;
afterEach(() => {
	setLanguages([...original]);
});

describe('usePreferredLanguages', () => {
	it('reports navigator.languages as-is', async () => {
		setLanguages(['fr-FR', 'fr', 'en']);
		const { api, dispose } = await mountUtil(() => usePreferredLanguages());
		try {
			expect(api.value).toEqual(['fr-FR', 'fr', 'en']);
		} finally {
			await dispose();
		}
	});

	it('updates when the browser fires languagechange', async () => {
		setLanguages(['en']);
		const { api, dispose } = await mountUtil(() => usePreferredLanguages());
		try {
			expect(api.value).toEqual(['en']);

			setLanguages(['de', 'en']);
			window.dispatchEvent(new Event('languagechange'));
			await tick();
			expect(api.value).toEqual(['de', 'en']);
		} finally {
			await dispose();
		}
	});

	it('ignores unrelated window events', async () => {
		setLanguages(['en']);
		const { api, dispose } = await mountUtil(() => usePreferredLanguages());
		try {
			window.dispatchEvent(new Event('resize'));
			await tick();
			expect(api.value).toEqual(['en']);
		} finally {
			await dispose();
		}
	});

	it('removes the languagechange listener on unmount', async () => {
		const remove = vi.spyOn(window, 'removeEventListener');
		const { dispose } = await mountUtil(() => usePreferredLanguages());
		await dispose();

		expect(
			remove.mock.calls.some(([type, handler]) => type === 'languagechange' && !!handler)
		).toBe(true);
	});

	it('stops updating once unmounted', async () => {
		setLanguages(['en']);
		const { api, dispose } = await mountUtil(() => usePreferredLanguages());
		await dispose();

		setLanguages(['ja']);
		window.dispatchEvent(new Event('languagechange'));
		await tick();
		expect(api.value).toEqual(['en']);
	});

	it('reads live state through the getter', async () => {
		setLanguages(['en']);
		// Built inside an effect context (so `useEventListener` attaches), but read
		// from outside any reaction: `value` is plain `$state`, so the getter must
		// track it without needing a subscriber. Contrast with the utils built on
		// Svelte's `MediaQuery`, whose `.current` only refreshes while subscribed.
		const holder: { dir?: UsePreferredLanguagesReturn } = {};
		const { dispose } = await mountUtil(() => {
			holder.dir = usePreferredLanguages();
			return holder.dir;
		});
		try {
			expect(holder.dir?.value).toEqual(['en']);

			setLanguages(['es']);
			window.dispatchEvent(new Event('languagechange'));
			await tick();
			expect(holder.dir?.value).toEqual(['es']);
		} finally {
			await dispose();
		}
	});
});
