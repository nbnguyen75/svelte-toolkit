// @vitest-environment jsdom
/**
 * jsdom ships a real `MutationObserver`, so these tests exercise the real
 * thing: the util watches `document.body`, and removing a node - or an ancestor
 * of it - must produce a call. Delivery is a microtask, hence `tick()`.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tick } from 'svelte';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountSetup } from '../../../../test/fixtures/mount.ts';
import { onElementRemoval } from './index.ts';

const created: Element[] = [];

function box(parent: Element = document.body): HTMLDivElement {
	const el = document.createElement('div');
	parent.append(el);
	created.push(el);
	return el;
}

afterEach(() => {
	for (const el of created) el.remove();
	created.length = 0;
});

describe('onElementRemoval', () => {
	it('fires when the element itself is removed', async () => {
		const el = box();
		const callback = vi.fn();
		await mountSetup(() => {
			onElementRemoval(() => el, callback);
		});
		await tick();

		el.remove();
		await tick();

		expect(callback).toHaveBeenCalledTimes(1);
		expect(callback.mock.calls[0]?.[0]).toHaveLength(1);
	});

	it('fires when an ancestor is removed, and passes the record through', async () => {
		const parent = box();
		const child = box(parent);
		const callback = vi.fn();
		await mountSetup(() => {
			onElementRemoval(() => child, callback);
		});
		await tick();

		parent.remove();
		await tick();

		expect(callback).toHaveBeenCalledTimes(1);
		const [records] = callback.mock.calls[0] as [MutationRecord[]];
		expect(records[0]?.removedNodes).toContain(parent);
	});

	it('does not fire for an unrelated removal', async () => {
		const el = box();
		const callback = vi.fn();
		await mountSetup(() => {
			onElementRemoval(() => el, callback);
		});
		await tick();

		box().remove();
		await tick();

		expect(callback).not.toHaveBeenCalled();
	});

	it('does not fire when a sibling of an ancestor is added', async () => {
		const el = box();
		const callback = vi.fn();
		await mountSetup(() => {
			onElementRemoval(() => el, callback);
		});
		await tick();

		box(document.body);
		await tick();

		expect(callback).not.toHaveBeenCalled();
	});

	it('picks up a target that resolves after setup', async () => {
		// `createBox`, not a plain `let`: a real `bind:this` writes `$state`, and a
		// plain variable would make the test pass for the wrong reason - the util
		// would never be told the element arrived.
		const el = createBox<HTMLDivElement | null>(null);
		const callback = vi.fn();
		await mountSetup(() => {
			onElementRemoval(() => el.value, callback);
		});
		await tick();

		// Nothing was observed yet, so this must not fire.
		box().remove();
		await tick();
		expect(callback).not.toHaveBeenCalled();

		// `bind:this` resolves now, so the observer re-arms on it.
		const late = box();
		el.value = late;
		await tick();
		late.remove();
		await tick();

		expect(callback).toHaveBeenCalledTimes(1);
	});

	it('watches a document supplied by option', async () => {
		const other = document.implementation.createHTMLDocument('other');
		const el = other.createElement('div');
		other.body.append(el);

		const callback = vi.fn();
		await mountSetup(() => {
			onElementRemoval(() => el, callback, { document: () => other });
		});
		await tick();

		el.remove();
		await tick();

		expect(callback).toHaveBeenCalledTimes(1);
	});

	it('ignores removals in the other document when one is supplied', async () => {
		const other = document.implementation.createHTMLDocument('other');
		const el = box();
		const callback = vi.fn();
		await mountSetup(() => {
			onElementRemoval(() => el, callback, { document: () => other });
		});
		await tick();

		el.remove();
		await tick();

		expect(callback).not.toHaveBeenCalled();
	});

	it('stop() ends the watch', async () => {
		const el = box();
		const callback = vi.fn();
		let stop: () => void = () => {};
		await mountSetup(() => {
			stop = onElementRemoval(() => el, callback);
		});
		await tick();

		stop();
		await tick();
		el.remove();
		await tick();

		expect(callback).not.toHaveBeenCalled();
	});

	it('releases the observer on unmount', async () => {
		const el = box();
		const callback = vi.fn();
		const { dispose } = await mountSetup(() => {
			onElementRemoval(() => el, callback);
		});
		await tick();

		await dispose();
		el.remove();
		await tick();

		expect(callback).not.toHaveBeenCalled();
	});

	it('does nothing without an element, and stays safe to stop', async () => {
		const callback = vi.fn();
		let stop: () => void = () => {};
		await mountSetup(() => {
			stop = onElementRemoval(() => null, callback);
		});
		await tick();

		box().remove();
		await tick();

		expect(callback).not.toHaveBeenCalled();
		expect(() => stop()).not.toThrow();
	});

	it('catches a removal that arrives in the same batch as another change', async () => {
		const el = box();
		const callback = vi.fn();
		await mountSetup(() => {
			onElementRemoval(() => el, callback);
		});
		await tick();

		const other = box();
		document.body.append(box());
		el.remove();
		other.remove();
		await tick();

		expect(callback).toHaveBeenCalledTimes(1);
	});

	it('handles a removed node that has no children of its own', async () => {
		const el = box();
		const callback = vi.fn();
		await mountSetup(() => {
			onElementRemoval(() => el, callback);
		});
		await tick();

		// `removedNodes` holds the detached node; `contains` on a leaf is false,
		// so the identity check is what has to carry this case.
		el.remove();
		await tick();

		expect(callback).toHaveBeenCalledTimes(1);
	});
});
