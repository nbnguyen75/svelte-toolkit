// @vitest-environment jsdom
/**
 * `useControllableState` owns reactive state, so it is created at init and
 * read from a separate effect — the real usage shape.
 */
import { describe, expect, it } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountInitialized } from '../../../../test/fixtures/mount.ts';
import type { UseControllableStateReturn } from './index.ts';
import { useControllableState } from './index.ts';

describe('useControllableState', () => {
	it('starts from the default value when uncontrolled', async () => {
		const { api, dispose } = await mountInitialized(
			() => useControllableState<string>({ defaultValue: 'closed' }),
			() => {}
		);
		const state: UseControllableStateReturn<string> = api;

		expect(state.value).toBe('closed');
		await dispose();
	});

	it('writes internal state while uncontrolled', async () => {
		const { api, dispose } = await mountInitialized(
			() => useControllableState<string>({ defaultValue: 'a' }),
			() => {}
		);

		api.value = 'b';
		expect(api.value).toBe('b');
		await dispose();
	});

	it('reports the controlled value', async () => {
		const value = createBox<string | undefined>('parent');
		const { api, dispose } = await mountInitialized(
			() => useControllableState<string>({ value: () => value.value }),
			() => {}
		);

		expect(api.value).toBe('parent');
		value.value = 'updated';
		expect(api.value).toBe('updated');
		await dispose();
	});

	it('ignores writes while controlled', async () => {
		const value = createBox<string | undefined>('parent');
		const { api, dispose } = await mountInitialized(
			() => useControllableState<string>({ value: () => value.value }),
			() => {}
		);

		api.value = 'child-write';
		expect(api.value).toBe('parent');
		await dispose();
	});

	it('locks the mode at setup', async () => {
		// Starts uncontrolled; a `value` arriving later does not take over,
		// because flipping modes mid-life drops state silently.
		const value = createBox<string | undefined>(undefined);
		const { api, dispose } = await mountInitialized(
			() =>
				useControllableState<string>({
					value: () => value.value,
					defaultValue: 'mine'
				}),
			() => {}
		);

		expect(api.value).toBe('mine');
		value.value = 'takeover';
		expect(api.value).toBe('mine');
		await dispose();
	});

	it('reads a default getter once, not per access', async () => {
		const fallback = createBox('first');
		const { api, dispose } = await mountInitialized(
			() => useControllableState<string>({ defaultValue: () => fallback.value }),
			() => {}
		);

		expect(api.value).toBe('first');
		fallback.value = 'second';
		expect(api.value).toBe('first');
		await dispose();
	});

	it('starts undefined with neither option', async () => {
		const { api, dispose } = await mountInitialized(
			() => useControllableState<string>(),
			() => {}
		);

		expect(api.value).toBe(undefined);
		api.value = 'set';
		expect(api.value).toBe('set');
		await dispose();
	});
});
