// @vitest-environment jsdom
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountUtil } from '../../../../test/fixtures/mount.ts';
import type { UseFullscreenOptions } from './index.ts';
import { useFullscreen } from './index.ts';

const disposers: (() => Promise<void>)[] = [];

/** Register a teardown that tolerates being called twice, so a test can dispose early. */
function track(dispose: () => Promise<void>): () => Promise<void> {
	let done = false;
	const once = async () => {
		if (done) return;
		done = true;
		await dispose();
	};
	disposers.push(once);
	return once;
}

/** jsdom implements none of the Fullscreen API, so it is stubbed per element. */
let fullscreenElement: Element | null = null;
let request: ReturnType<typeof vi.fn>;
let exit: ReturnType<typeof vi.fn>;
let stubbed: Element;

function stub(el: Element): void {
	stubbed = el;
	fullscreenElement = null;
	request = vi.fn().mockResolvedValue(undefined);
	exit = vi.fn().mockResolvedValue(undefined);
	Object.defineProperty(el, 'requestFullscreen', { configurable: true, value: request });
	Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exit });
	Object.defineProperty(document, 'fullscreenElement', {
		configurable: true,
		get: () => fullscreenElement
	});
}

function unstub(): void {
	Reflect.deleteProperty(stubbed, 'requestFullscreen');
	Reflect.deleteProperty(document, 'exitFullscreen');
	Reflect.deleteProperty(document, 'fullscreenElement');
}

/** Enter fullscreen the way a browser does: set the element, then announce it. */
function goFullscreen(el: Element): void {
	fullscreenElement = el;
	document.dispatchEvent(new Event('fullscreenchange'));
}

function leaveFullscreen(): void {
	fullscreenElement = null;
	document.dispatchEvent(new Event('fullscreenchange'));
}

/** Mount against the stubbed element and settle the effects. */
async function setup(options?: UseFullscreenOptions) {
	const { api, dispose } = await mountUtil(() => useFullscreen(stubbed, options));
	const once = track(dispose);
	await tick();
	return { api, dispose: once };
}

function box(): HTMLDivElement {
	const el = document.createElement('div');
	document.body.appendChild(el);
	return el;
}

beforeEach(() => {
	stub(box());
});

afterEach(async () => {
	for (const dispose of disposers.splice(0)) await dispose();
	unstub();
	document.body.replaceChildren();
});

describe('useFullscreen', () => {
	it('reports support when the API is present', async () => {
		const { api } = await setup();

		expect(api.isSupported).toBe(true);
	});

	it('reports no support without requestFullscreen', async () => {
		Reflect.deleteProperty(stubbed, 'requestFullscreen');

		const { api } = await setup();

		expect(api.isSupported).toBe(false);
		await api.enter();
		expect(request).not.toHaveBeenCalled();
	});

	it('reports no support without exitFullscreen', async () => {
		Reflect.deleteProperty(document, 'exitFullscreen');

		const { api } = await setup();

		expect(api.isSupported).toBe(false);
		await api.exit();
		expect(exit).not.toHaveBeenCalled();
	});

	it('starts out not fullscreen', async () => {
		const { api } = await setup();

		expect(api.isFullscreen).toBe(false);
	});

	it('enters fullscreen and flips the flag', async () => {
		const { api } = await setup();

		await api.enter();

		expect(request).toHaveBeenCalledOnce();
		expect(api.isFullscreen).toBe(true);
	});

	it('exits fullscreen and clears the flag', async () => {
		const { api } = await setup();
		await api.enter();

		await api.exit();

		expect(exit).toHaveBeenCalledOnce();
		expect(api.isFullscreen).toBe(false);
	});

	it('ignores enter while already fullscreen', async () => {
		const { api } = await setup();
		await api.enter();

		await api.enter();

		expect(request).toHaveBeenCalledOnce();
	});

	it('ignores exit while not fullscreen', async () => {
		const { api } = await setup();

		await api.exit();

		expect(exit).not.toHaveBeenCalled();
	});

	it('toggles both ways', async () => {
		const { api } = await setup();

		await api.toggle();
		expect(api.isFullscreen).toBe(true);

		await api.toggle();
		expect(api.isFullscreen).toBe(false);
	});

	it('adopts the browser answer on fullscreenchange', async () => {
		const { api } = await setup();

		goFullscreen(stubbed);

		expect(api.isFullscreen).toBe(true);
	});

	it('clears the flag when the browser reports nothing in fullscreen', async () => {
		const { api } = await setup();
		await api.enter();

		leaveFullscreen();

		expect(api.isFullscreen).toBe(false);
	});

	it('ignores another element going fullscreen', async () => {
		const { api } = await setup();

		goFullscreen(box());

		expect(api.isFullscreen).toBe(false);
	});

	it('keeps its own answer while another element holds fullscreen', async () => {
		const { api } = await setup();
		await api.enter();

		goFullscreen(box());
		expect(api.isFullscreen).toBe(true);

		goFullscreen(stubbed);
		expect(api.isFullscreen).toBe(true);

		leaveFullscreen();
		expect(api.isFullscreen).toBe(false);
	});

	it('syncs an already-fullscreen target on mount', async () => {
		goFullscreen(stubbed);

		const { api } = await setup();

		expect(api.isFullscreen).toBe(true);
	});

	it('defaults to the document element', async () => {
		Object.defineProperty(document.documentElement, 'requestFullscreen', {
			configurable: true,
			value: request
		});
		const { api, dispose } = await mountUtil(() => useFullscreen());
		track(dispose);
		await tick();

		await api.enter();

		expect(request).toHaveBeenCalledOnce();
		expect(api.isFullscreen).toBe(true);
		Reflect.deleteProperty(document.documentElement, 'requestFullscreen');
	});

	it('follows a target that resolves later', async () => {
		const source = createBox<HTMLElement | undefined>(undefined);
		const { api, dispose } = await mountUtil(() => useFullscreen(() => source.value));
		track(dispose);
		await tick();

		expect(api.isSupported).toBe(false);

		const el = box();
		stub(el);
		source.value = el;
		await tick();

		expect(api.isSupported).toBe(true);
	});

	it('exits fullscreen on unmount when autoExit is set', async () => {
		const { api, dispose } = await setup({ autoExit: true });
		await api.enter();

		await dispose();

		expect(exit).toHaveBeenCalledOnce();
	});

	it('leaves fullscreen alone on unmount by default', async () => {
		const { api, dispose } = await setup();
		await api.enter();

		await dispose();

		expect(exit).not.toHaveBeenCalled();
	});

	it('stops listening once disposed', async () => {
		const { api, dispose } = await setup();
		await dispose();

		goFullscreen(stubbed);

		expect(api.isFullscreen).toBe(false);
	});

	it('reads live through the object, while destructuring takes a snapshot', async () => {
		const { api } = await setup();
		const { isFullscreen } = api;

		await api.enter();

		expect(isFullscreen).toBe(false);
		expect(api.isFullscreen).toBe(true);
	});
});
