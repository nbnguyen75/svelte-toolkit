// @vitest-environment jsdom
import { tick } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';

import { mountUtil } from '../../../../test/fixtures/mount.ts';
import { usePageLeave } from './index.ts';

const disposers: (() => Promise<void>)[] = [];

/** Mount a fresh util and make sure its listeners go away with it. */
async function setup(): Promise<{ isLeft: () => boolean }> {
	const { api, dispose } = await mountUtil(() => usePageLeave());
	disposers.push(dispose);
	await tick();
	return { isLeft: () => api.isLeft };
}

/** `mouseout` as the browser reports it: `relatedTarget` is where the pointer went. */
function mouseOut(relatedTarget: EventTarget | null): void {
	window.dispatchEvent(new MouseEvent('mouseout', { relatedTarget }));
}

function documentLeave(): void {
	document.dispatchEvent(new MouseEvent('mouseleave'));
}

function documentEnter(): void {
	document.dispatchEvent(new MouseEvent('mouseenter'));
}

afterEach(async () => {
	for (const dispose of disposers.splice(0)) await dispose();
	document.body.replaceChildren();
});

describe('usePageLeave', () => {
	it('starts false', async () => {
		const zone = await setup();

		expect(zone.isLeft()).toBe(false);
	});

	it('is true once the pointer leaves the document', async () => {
		const zone = await setup();

		documentLeave();

		expect(zone.isLeft()).toBe(true);
	});

	it('is true on a window mouseout with no relatedTarget', async () => {
		const zone = await setup();

		mouseOut(null);

		expect(zone.isLeft()).toBe(true);
	});

	it('is false on a window mouseout that stays inside the page', async () => {
		const zone = await setup();
		const inside = document.createElement('div');

		mouseOut(inside);

		expect(zone.isLeft()).toBe(false);
	});

	it('goes back to false when the pointer re-enters', async () => {
		const zone = await setup();

		documentLeave();
		documentEnter();

		expect(zone.isLeft()).toBe(false);
	});

	it('clears on re-entry even though that mouseenter has no relatedTarget', async () => {
		const zone = await setup();

		documentLeave();
		// Entering from outside the window: `relatedTarget` is null here, which is
		// exactly the case VueUse's single shared handler gets backwards.
		document.dispatchEvent(new MouseEvent('mouseenter', { relatedTarget: null }));

		expect(zone.isLeft()).toBe(false);
	});

	it('follows leave/enter cycles', async () => {
		const zone = await setup();

		documentLeave();
		expect(zone.isLeft()).toBe(true);

		documentEnter();
		expect(zone.isLeft()).toBe(false);

		mouseOut(null);
		expect(zone.isLeft()).toBe(true);
	});

	it('reads live through the object, while destructuring takes a snapshot', async () => {
		const { api, dispose } = await mountUtil(() => usePageLeave());
		disposers.push(dispose);
		const { isLeft } = api;
		await tick();

		documentLeave();

		expect(isLeft).toBe(false);
		expect(api.isLeft).toBe(true);
	});

	it('stops listening once disposed', async () => {
		const { api, dispose } = await mountUtil(() => usePageLeave());
		await tick();

		documentLeave();
		expect(api.isLeft).toBe(true);

		await dispose();

		documentEnter();

		// Still `true`: the enter landed after teardown, so nothing heard it.
		expect(api.isLeft).toBe(true);
	});
});
