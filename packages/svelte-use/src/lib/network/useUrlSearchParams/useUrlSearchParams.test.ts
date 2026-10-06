// @vitest-environment jsdom
/**
 * `useUrlSearchParams` owns reactive state, so it is created at init and read
 * from a separate effect — the real usage shape.
 */
import { describe, expect, it } from 'vitest';

import { mountInitialized } from '../../../../test/fixtures/mount.ts';
import type { UrlParams } from './index.ts';
import { useUrlSearchParams } from './index.ts';

/** Point the URL somewhere known without navigating. */
function setUrl(url: string): void {
	window.history.replaceState({}, '', url);
}

/** Mount the util and hand back its params record. */
async function paramsOf(
	mode: 'history' | 'hash' | 'hash-params',
	options?: Parameters<typeof useUrlSearchParams>[1]
): Promise<{ params: UrlParams; dispose: () => Promise<void> }> {
	const { api, dispose } = await mountInitialized(
		() => useUrlSearchParams(mode, options),
		() => {}
	);
	return { params: api, dispose };
}

/** Let the write-back effect run. */
function flush(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('useUrlSearchParams', () => {
	it('reads the current query on mount', async () => {
		setUrl('/?page=2&tag=a&tag=b');
		const { params, dispose } = await paramsOf('history');

		expect(params.page).toBe('2');
		expect(params.tag).toEqual(['a', 'b']);
		await dispose();
	});

	it('falls back to the initial value with an empty query', async () => {
		setUrl('/');
		const { params, dispose } = await paramsOf('history', { initialValue: { page: '1' } });

		expect(params.page).toBe('1');
		await dispose();
	});

	it('writes edits back to the URL', async () => {
		setUrl('/');
		const { params, dispose } = await paramsOf('history');

		params.page = '3';
		await flush();

		expect(window.location.search).toBe('?page=3');
		await dispose();
	});

	it('does not write on mount alone', async () => {
		setUrl('/?page=2');
		const { params, dispose } = await paramsOf('history');
		await flush();

		// Same URL as before mount: the initial read must not write back.
		expect(window.location.search).toBe('?page=2');
		expect(params.page).toBe('2');
		await dispose();
	});

	it('pushes a new entry in push mode without duplicating', async () => {
		setUrl('/?page=1');
		const before = window.history.length;
		const { params, dispose } = await paramsOf('history', { writeMode: 'push' });

		params.page = '2';
		await flush();

		// Exactly one new entry: the edit. The popstate sync must not push a
		// second copy of the same URL.
		expect(window.history.length).toBe(before + 1);
		expect(window.location.search).toBe('?page=2');
		await dispose();
	});

	it('absorbs back/forward navigation', async () => {
		setUrl('/?page=1');
		const { params, dispose } = await paramsOf('history');

		setUrl('/?page=9');
		window.dispatchEvent(new PopStateEvent('popstate'));

		expect(params.page).toBe('9');
		await dispose();
	});

	it('drops removed keys', async () => {
		setUrl('/?page=1&gone=yes');
		const { params, dispose } = await paramsOf('history');

		expect(params.gone).toBe('yes');
		delete params.gone;
		await flush();

		expect(window.location.search).toBe('?page=1');
		await dispose();
	});

	it('reads hash params in hash-params mode', async () => {
		setUrl('/#page=4');
		const { params, dispose } = await paramsOf('hash-params');

		expect(params.page).toBe('4');
		params.page = '5';
		await flush();

		expect(window.location.hash).toBe('#page=5');
		await dispose();
	});
});
