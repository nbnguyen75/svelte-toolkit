// @vitest-environment jsdom
/**
 * jsdom implements neither the Pointer Lock API nor its events, so this file
 * installs the minimum surface the util uses: `document.pointerLockElement` as a
 * settable property, `exitPointerLock`, `Element.requestPointerLock`, and the
 * `pointerlockchange` / `pointerlockerror` events dispatched by hand.
 *
 * `lock` resolves only when `pointerlockchange` reports the element, so the fake
 * lock acquisition has to be triggered deliberately - which is also what makes
 * the "resolves after the change, not before" case testable.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mountInitialized } from '../../../../test/fixtures/mount.ts';
import { usePointerLock } from './index.ts';

/** The fake API the tests drive: what was requested, and when it was granted. */
type PointerLockStub = {
	exit: ReturnType<typeof vi.fn>;
	requested: Element[];
	grant: (el: Element | null) => void;
};

/**
 * Installs the fake API. `requestPointerLock` only *records* the request - the
 * test decides when the browser grants it, which is what makes "resolves after
 * the change, not before" testable.
 */
function installPointerLock(): PointerLockStub {
	const exit = vi.fn();
	(document as Document & { exitPointerLock: unknown }).exitPointerLock = exit;

	let locked: Element | null = null;
	Object.defineProperty(document, 'pointerLockElement', {
		configurable: true,
		get: () => locked
	});

	const requested: Element[] = [];
	Element.prototype.requestPointerLock = function requestPointerLock(this: Element) {
		requested.push(this);
	};

	return {
		exit,
		requested,
		grant(el) {
			locked = el;
			document.dispatchEvent(new Event('pointerlockchange'));
		}
	};
}

let stub: PointerLockStub;
let original: {
	requestPointerLock: typeof Element.prototype.requestPointerLock;
	exitPointerLock: unknown;
};

function box(): HTMLDivElement {
	const el = document.createElement('div');
	document.body.append(el);
	return el;
}

describe('usePointerLock', () => {
	beforeEach(() => {
		original = {
			requestPointerLock: Element.prototype.requestPointerLock,
			exitPointerLock: (document as Document & { exitPointerLock?: unknown }).exitPointerLock
		};
		stub = installPointerLock();
	});

	afterEach(() => {
		Element.prototype.requestPointerLock = original.requestPointerLock;
		(document as Document & { exitPointerLock?: unknown }).exitPointerLock =
			original.exitPointerLock;
		document.body.innerHTML = '';
	});

	it('reports support and starts unlocked', async () => {
		const { api, dispose } = await mountInitialized(
			() => usePointerLock(),
			() => {}
		);
		expect(api.isSupported).toBe(true);
		expect(api.element).toBe(null);
		await dispose();
	});

	it('requests the lock and resolves once granted', async () => {
		const el = box();
		const { api, dispose } = await mountInitialized(
			() => usePointerLock(() => el),
			() => {}
		);

		const locked = api.lock(el);
		// Not resolved yet: the browser has not granted it.
		let settled = false;
		void locked.then(() => {
			settled = true;
		});
		await Promise.resolve();
		expect(settled).toBe(false);

		stub.grant(el);
		await expect(locked).resolves.toBe(el);
		expect(api.element).toBe(el);
		await dispose();
	});

	it('rejects when the element is undefined', async () => {
		const { api, dispose } = await mountInitialized(
			() => usePointerLock(),
			() => {}
		);

		await expect(api.lock(null)).rejects.toThrow('Target element undefined.');
		await dispose();
	});

	it('unlock resolves false when nothing is locked', async () => {
		const { api, dispose } = await mountInitialized(
			() => usePointerLock(),
			() => {}
		);

		await expect(api.unlock()).resolves.toBe(false);
		await dispose();
	});

	it('unlock exits and resolves once released', async () => {
		const el = box();
		const { api, dispose } = await mountInitialized(
			() => usePointerLock(() => el),
			() => {}
		);

		const locked = api.lock(el);
		stub.grant(el);
		await locked;

		const released = api.unlock();
		stub.grant(null);
		await expect(released).resolves.toBe(true);
		expect(stub.exit).toHaveBeenCalledTimes(1);
		expect(api.element).toBe(null);
		await dispose();
	});

	it('ignores a lock change for an unrelated element', async () => {
		const el = box();
		const other = box();
		const { api, dispose } = await mountInitialized(
			() => usePointerLock(() => el),
			() => {}
		);

		void api.lock(el).catch(() => {});
		stub.grant(other);

		expect(api.element).toBe(null);
		await dispose();
	});

	it('takes the element from an event currentTarget', async () => {
		const el = box();
		const { api, dispose } = await mountInitialized(
			() => usePointerLock(() => el),
			() => {}
		);

		const locked = api.lock(new Event('pointerdown'));
		stub.grant(el);
		await expect(locked).resolves.toBe(el);
		await dispose();
	});

	it('records triggerElement only for the event form', async () => {
		const el = box();
		const { api, dispose } = await mountInitialized(
			() => usePointerLock(() => el),
			() => {}
		);

		void api.lock(el).catch(() => {});
		expect(api.triggerElement).toBe(null);
		await dispose();
	});

	it('throws when the document lacks the API', async () => {
		// Deleted, not set to `undefined`: support is an `in` check, and a property
		// present-but-undefined would still answer true.
		const originalDescriptor = Object.getOwnPropertyDescriptor(document, 'pointerLockElement');
		Reflect.deleteProperty(document, 'pointerLockElement');

		// `isSupported` is read at setup, so this util instance is unsupported.
		const { api, dispose } = await mountInitialized(
			() => usePointerLock(),
			() => {}
		);
		await expect(api.lock(box())).rejects.toThrow('not supported');
		expect(api.isSupported).toBe(false);
		// And it must not have tried to bind listeners to a document it cannot use.
		await expect(api.unlock()).resolves.toBe(false);

		if (originalDescriptor) {
			Object.defineProperty(document, 'pointerLockElement', originalDescriptor);
		}
		await dispose();
	});

	it('surfaces a lock error for the tracked element', async () => {
		const el = box();
		const { api, dispose } = await mountInitialized(
			() => usePointerLock(() => el),
			() => {}
		);

		void api.lock(el).catch(() => {});
		document.dispatchEvent(new Event('pointerlockerror'));
		expect(api.element).toBe(null);
		await dispose();
	});

	it('uses a document supplied by option', async () => {
		const other = document.implementation.createHTMLDocument('other');
		const el = other.createElement('div');
		other.body.append(el);

		const { api, dispose } = await mountInitialized(
			() => usePointerLock(() => el, { document: () => other }),
			() => {}
		);
		const locked = api.lock(el);

		let granted: Element | null = null;
		Object.defineProperty(other, 'pointerLockElement', {
			configurable: true,
			get: () => granted
		});
		granted = el;
		other.dispatchEvent(new Event('pointerlockchange'));

		await expect(locked).resolves.toBe(el);
		expect(api.element).toBe(el);
		await dispose();
	});

	it('releases its document listeners on unmount', async () => {
		const el = box();
		const { dispose } = await mountInitialized(
			() => usePointerLock(() => el),
			() => {}
		);

		await dispose();
		// A change after teardown must not reach the destroyed component.
		expect(() => stub.grant(el)).not.toThrow();
	});
});
