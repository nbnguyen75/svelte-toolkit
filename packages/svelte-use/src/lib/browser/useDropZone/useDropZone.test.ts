// @vitest-environment jsdom
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountUtil } from '../../../../test/fixtures/mount.ts';
import type { DragInit } from '../../../../test/fixtures/pointer.ts';
import { dragEvent, dropFile } from '../../../../test/fixtures/pointer.ts';
import type { UseDropZoneOptions } from './index.ts';
import { useDropZone } from './index.ts';

const mounted: (() => Promise<void>)[] = [];

afterEach(async () => {
	for (const dispose of mounted.splice(0)) await dispose();
});

function box(): HTMLElement {
	const el = document.createElement('div');
	document.body.append(el);
	return el;
}

/** Watch `document.body` unless told otherwise, so `fire(el, …)` has one subject. */
async function setup(options?: UseDropZoneOptions, target: HTMLElement | Document = document.body) {
	const { api, dispose } = await mountUtil(() => useDropZone(() => target, options));
	mounted.push(dispose);
	return api;
}

function fire(el: HTMLElement | Document, type: string, init: DragInit = {}): DragEvent {
	const event = dragEvent(type, init);
	el.dispatchEvent(event);
	return event;
}

const text = (): File[] => [dropFile('a.txt')];

describe('useDropZone', () => {
	it('starts with nothing dropped and no drag over it', async () => {
		const zone = await setup();

		expect(zone.files).toBeNull();
		expect(zone.isOverDropZone).toBe(false);
	});

	it('reports a drag entering the zone', async () => {
		const onEnter = vi.fn();
		const zone = await setup({ onEnter });

		fire(document.body, 'dragenter', { files: text() });

		expect(zone.isOverDropZone).toBe(true);
		expect(onEnter).toHaveBeenCalledOnce();
		expect(onEnter.mock.calls[0]?.[0]).toBeNull();
	});

	it('reports a drag moving over the zone without claiming it is over', async () => {
		const onOver = vi.fn();
		const zone = await setup({ onOver });

		fire(document.body, 'dragover', { files: text() });

		expect(onOver).toHaveBeenCalledOnce();
		expect(onOver.mock.calls[0]?.[0]).toBeNull();
		expect(zone.isOverDropZone).toBe(false);
	});

	it('reports a drag leaving the zone', async () => {
		const onLeave = vi.fn();
		const zone = await setup({ onLeave });

		fire(document.body, 'dragenter', { files: text() });
		expect(zone.isOverDropZone).toBe(true);

		fire(document.body, 'dragleave', { files: text() });
		expect(zone.isOverDropZone).toBe(false);
		expect(onLeave).toHaveBeenCalledOnce();
	});

	it('stays over the zone until the last nested drag leaves', async () => {
		const zone = await setup();

		fire(document.body, 'dragenter', { files: text() });
		fire(document.body, 'dragenter', { files: text() });
		expect(zone.isOverDropZone).toBe(true);

		// A drag crossing a child fires leave on the way out and enter again.
		fire(document.body, 'dragleave', { files: text() });
		expect(zone.isOverDropZone).toBe(true);

		fire(document.body, 'dragleave', { files: text() });
		expect(zone.isOverDropZone).toBe(false);
	});

	it('recovers from an unbalanced dragleave instead of sticking over', async () => {
		const zone = await setup();

		fire(document.body, 'dragenter', { files: text() });
		fire(document.body, 'dragleave', { files: text() });
		// A second leave with no matching enter. Upstream drives its counter to -1
		// here, and `counter === 0` is then never true again.
		fire(document.body, 'dragleave', { files: text() });

		fire(document.body, 'dragenter', { files: text() });
		expect(zone.isOverDropZone).toBe(true);

		fire(document.body, 'dragleave', { files: text() });
		expect(zone.isOverDropZone).toBe(false);
	});

	it('exposes the dropped files and clears the over state', async () => {
		const onDrop = vi.fn();
		const zone = await setup({ onDrop });
		const files = [dropFile('a.txt'), dropFile('b.txt')];

		fire(document.body, 'dragenter', { files });
		fire(document.body, 'drop', { files });

		expect(zone.files).toEqual(files);
		expect(zone.isOverDropZone).toBe(false);
		expect(onDrop).toHaveBeenCalledOnce();
		expect(onDrop.mock.calls[0]?.[0]).toEqual(files);
	});

	it('reports null for a drop carrying no files', async () => {
		const onDrop = vi.fn();
		const zone = await setup({ onDrop });

		// Dragging selected text has a dataTransfer but no files.
		fire(document.body, 'drop', {});

		expect(zone.files).toBeNull();
		expect(onDrop).toHaveBeenCalledOnce();
		expect(onDrop.mock.calls[0]?.[0]).toBeNull();
	});

	it('rejects a drop of two files when multiple is off', async () => {
		const onDrop = vi.fn();
		const zone = await setup({ multiple: false, onDrop });

		fire(document.body, 'drop', { files: [dropFile('a.txt'), dropFile('b.txt')] });

		expect(zone.files).toBeNull();
		expect(onDrop).not.toHaveBeenCalled();
	});

	it('keeps only the first file when multiple is off but validity is overridden', async () => {
		// The default check rejects a multi-file drop outright, so the truncation to
		// the first file is only reachable once `checkValidity` has approved it.
		const zone = await setup({ multiple: false, checkValidity: () => true });
		const files = [dropFile('a.txt'), dropFile('b.txt')];

		fire(document.body, 'drop', { files });

		expect(zone.files).toEqual([files[0]]);
	});

	it('rejects a drop whose types are not allowed', async () => {
		const onDrop = vi.fn();
		const zone = await setup({ dataTypes: ['image'], onDrop });

		fire(document.body, 'drop', { files: text() });

		expect(zone.files).toBeNull();
		expect(onDrop).not.toHaveBeenCalled();
	});

	it('marks a rejected drag as an unacceptable drop and leaves it unprevented', async () => {
		await setup({ dataTypes: ['image'] });

		const event = fire(document.body, 'dragover', { files: text() });

		expect(event.dataTransfer?.dropEffect).toBe('none');
		expect(event.defaultPrevented).toBe(false);
	});

	it('accepts a type matching a substring of the allowed list', async () => {
		const zone = await setup({ dataTypes: ['image'] });

		fire(document.body, 'drop', { files: [dropFile('a.png', 'image/png')] });

		expect(zone.files).toHaveLength(1);
	});

	it('rejects the whole drop when any one item has a disallowed type', async () => {
		const zone = await setup({ dataTypes: ['image'] });

		fire(document.body, 'drop', { files: [dropFile('a.png', 'image/png'), dropFile('b.txt')] });

		expect(zone.files).toBeNull();
	});

	it('rejects an item-less drag when types are restricted', async () => {
		const onDrop = vi.fn();
		await setup({ dataTypes: ['image'], onDrop });

		fire(document.body, 'drop', {});

		expect(onDrop).not.toHaveBeenCalled();
	});

	it('accepts an item-less drag when no types are restricted', async () => {
		const onDrop = vi.fn();
		await setup({ onDrop });

		fire(document.body, 'drop', {});

		expect(onDrop).toHaveBeenCalledOnce();
	});

	it('hands the item types to a dataTypes predicate', async () => {
		const dataTypes = vi.fn((types: readonly string[]) => types.includes('text/plain'));
		const zone = await setup({ dataTypes });

		fire(document.body, 'drop', { files: text() });

		expect(dataTypes).toHaveBeenCalledWith(['text/plain']);
		expect(zone.files).toHaveLength(1);
	});

	it('rejects whatever the dataTypes predicate rejects', async () => {
		const zone = await setup({ dataTypes: () => false });

		fire(document.body, 'drop', { files: text() });

		expect(zone.files).toBeNull();
	});

	it('prefers checkValidity over dataTypes', async () => {
		const checkValidity = vi.fn(() => true);
		const zone = await setup({ dataTypes: ['image'], checkValidity });

		fire(document.body, 'drop', { files: text() });

		expect(checkValidity).toHaveBeenCalledOnce();
		expect(zone.files).toHaveLength(1);
	});

	it('lets checkValidity reject what dataTypes would allow', async () => {
		const zone = await setup({ dataTypes: ['image'], checkValidity: () => false });

		fire(document.body, 'drop', { files: [dropFile('a.png', 'image/png')] });

		expect(zone.files).toBeNull();
	});

	it('re-reads checkValidity state on every drag event', async () => {
		const allowed = createBox(false);
		const zone = await setup({ checkValidity: () => allowed.value });

		fire(document.body, 'drop', { files: text() });
		expect(zone.files).toBeNull();

		allowed.value = true;
		fire(document.body, 'drop', { files: [dropFile('b.txt')] });
		expect(zone.files).toHaveLength(1);
	});

	it('prevents the default and marks an accepted drag as a copy', async () => {
		await setup();

		const event = fire(document.body, 'dragover', { files: text() });

		expect(event.defaultPrevented).toBe(true);
		expect(event.dataTransfer?.dropEffect).toBe('copy');
	});

	it('prevents an unhandled drop when asked to', async () => {
		await setup({ dataTypes: ['image'], preventDefaultForUnhandled: true });

		const event = fire(document.body, 'dragover', { files: text() });

		expect(event.defaultPrevented).toBe(true);
		expect(event.dataTransfer?.dropEffect).toBe('none');
	});

	it('treats a missing dataTransfer as unusable rather than throwing', async () => {
		const onDrop = vi.fn();
		const zone = await setup({ onDrop });

		fire(document.body, 'drop', { withoutDataTransfer: true });

		expect(zone.files).toBeNull();
		expect(onDrop).not.toHaveBeenCalled();
	});

	it('takes a bare function as onDrop', async () => {
		const onDrop = vi.fn();
		const { api, dispose } = await mountUtil(() => useDropZone(() => document.body, onDrop));
		mounted.push(dispose);
		const files = text();

		fire(document.body, 'drop', { files });

		expect(onDrop.mock.calls[0]?.[0]).toEqual(files);
		expect(api.files).toEqual(files);
	});

	it('watches a Document as well as an element', async () => {
		const onDrop = vi.fn();
		await setup({ onDrop }, document);

		fire(document, 'drop', { files: text() });

		expect(onDrop).toHaveBeenCalledOnce();
	});

	it('rebinds when the target changes', async () => {
		const onDrop = vi.fn();
		const first = box();
		const second = box();
		const target = createBox<HTMLElement | null>(first);
		const { dispose } = await mountUtil(() => useDropZone(() => target.value, { onDrop }));
		mounted.push(dispose);
		await tick();

		fire(first, 'drop', { files: text() });
		expect(onDrop).toHaveBeenCalledOnce();

		target.value = second;
		await tick();

		// The old element is no longer watched.
		fire(first, 'drop', { files: text() });
		expect(onDrop).toHaveBeenCalledOnce();

		fire(second, 'drop', { files: text() });
		expect(onDrop).toHaveBeenCalledTimes(2);
	});

	it('binds nothing when the target is nullish', async () => {
		const { api, dispose } = await mountUtil(() => useDropZone(() => null));
		mounted.push(dispose);

		expect(api.files).toBeNull();
		expect(api.isOverDropZone).toBe(false);
	});

	it('removes its listeners on unmount', async () => {
		const onDrop = vi.fn();
		const { dispose } = await mountUtil(() => useDropZone(() => document.body, { onDrop }));
		await dispose();

		fire(document.body, 'drop', { files: text() });

		expect(onDrop).not.toHaveBeenCalled();
	});
});
