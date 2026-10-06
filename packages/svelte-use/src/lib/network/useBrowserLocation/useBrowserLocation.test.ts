// @vitest-environment jsdom
/**
 * `useBrowserLocation` owns reactive state, so it is created at init and read
 * from a separate effect — the real usage shape.
 */
import { describe, expect, it } from 'vitest';

import { mountInitialized } from '../../../../test/fixtures/mount.ts';
import type { UseBrowserLocationReturn } from './index.ts';
import { useBrowserLocation } from './index.ts';

describe('useBrowserLocation', () => {
	it('snapshots the load location', async () => {
		const { api, dispose } = await mountInitialized(
			() => useBrowserLocation(),
			() => {}
		);
		const location: UseBrowserLocationReturn = api;

		expect(location.trigger).toBe('load');
		expect(location.href).toBe(window.location.href);
		expect(location.pathname).toBe(window.location.pathname);
		expect(typeof location.length).toBe('number');
		await dispose();
	});

	it('rebuilds on popstate', async () => {
		const { api, dispose } = await mountInitialized(
			() => useBrowserLocation(),
			() => {}
		);

		window.history.pushState({ page: 2 }, '', '/pushed?x=1#top');
		window.dispatchEvent(new PopStateEvent('popstate'));

		expect(api.trigger).toBe('popstate');
		expect(api.pathname).toBe('/pushed');
		expect(api.search).toBe('?x=1');
		expect(api.hash).toBe('#top');
		expect(api.state).toEqual({ page: 2 });
		await dispose();
	});

	it('rebuilds on hashchange', async () => {
		const { api, dispose } = await mountInitialized(
			() => useBrowserLocation(),
			() => {}
		);

		window.location.hash = '#section';
		// jsdom fires hashchange asynchronously; the util listens, it doesn't poll.
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(api.trigger).toBe('hashchange');
		expect(api.hash).toBe('#section');
		await dispose();
	});

	it('writes hash through to the location', async () => {
		const { api, dispose } = await mountInitialized(
			() => useBrowserLocation(),
			() => {}
		);

		api.hash = '#written';
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(window.location.hash).toBe('#written');
		expect(api.hash).toBe('#written');
		await dispose();
	});

	it('skips a write that changes nothing', async () => {
		const { api, dispose } = await mountInitialized(
			() => useBrowserLocation(),
			() => {}
		);

		// Same value: no navigation, so the trigger stays 'load'.
		api.hash = window.location.hash;
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(api.trigger).toBe('load');
		await dispose();
	});
});
