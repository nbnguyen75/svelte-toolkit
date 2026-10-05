// @vitest-environment jsdom
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mountUtil } from '../../../../test/fixtures/mount.ts';
import { useWindowFocus } from './index.ts';

const disposers: (() => Promise<void>)[] = [];

/** Mount a fresh util and make sure its listeners go away with it. */
async function setup(): Promise<{ focused: () => boolean }> {
	const { api, dispose } = await mountUtil(() => useWindowFocus());
	disposers.push(dispose);
	await tick();
	return { focused: () => api.focused };
}

function fireFocus(): void {
	window.dispatchEvent(new Event('focus'));
}

function fireBlur(): void {
	window.dispatchEvent(new Event('blur'));
}

afterEach(async () => {
	for (const dispose of disposers.splice(0)) await dispose();
	document.body.replaceChildren();
});

describe('useWindowFocus', () => {
	it('starts unfocused, because document.hasFocus() is false in jsdom', async () => {
		const zone = await setup();

		expect(zone.focused()).toBe(false);
	});

	it('turns true on focus', async () => {
		const zone = await setup();

		fireFocus();

		expect(zone.focused()).toBe(true);
	});

	it('turns false on blur', async () => {
		const zone = await setup();

		fireFocus();
		fireBlur();

		expect(zone.focused()).toBe(false);
	});

	it('follows a focus/blur pair in both directions', async () => {
		const zone = await setup();

		fireFocus();
		expect(zone.focused()).toBe(true);

		fireBlur();
		expect(zone.focused()).toBe(false);

		fireFocus();
		expect(zone.focused()).toBe(true);
	});

	it('reads live through the object, while destructuring takes a snapshot', async () => {
		const { api, dispose } = await mountUtil(() => useWindowFocus());
		disposers.push(dispose);
		const { focused } = api;
		await tick();

		fireFocus();

		// Destructuring runs the getter once, so the copy is a snapshot - the same
		// limit VueUse's refs have when you destructure a computed. Read through
		// the object (or in a template) to stay live.
		expect(focused).toBe(false);
		expect(api.focused).toBe(true);
	});

	it('seeds from document.hasFocus()', async () => {
		const spy = vi.spyOn(document, 'hasFocus').mockReturnValue(true);

		const zone = await setup();

		expect(zone.focused()).toBe(true);
		spy.mockRestore();
	});

	it('stops listening once disposed', async () => {
		const { api, dispose } = await mountUtil(() => useWindowFocus());
		await tick();

		fireFocus();
		expect(api.focused).toBe(true);

		await dispose();

		fireBlur();

		// Still `true`: the blur landed after teardown, so nothing heard it.
		expect(api.focused).toBe(true);
	});
});
