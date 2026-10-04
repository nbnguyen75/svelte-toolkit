// @vitest-environment jsdom
import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountInitialized, mountSetup } from '../../../../test/fixtures/mount.ts';
import { useMutationObserver } from './index.ts';

const noop = () => {};

/** Deliver whatever the observer has queued, as the platform microtask would. */
async function settle(): Promise<void> {
	await Promise.resolve();
	await tick();
}

describe('useMutationObserver', () => {
	it('reports the callback for a child list change', async () => {
		const list = document.createElement('ul');
		document.body.append(list);

		const callback = vi.fn();
		const { dispose } = await mountInitialized(
			() => useMutationObserver(list, callback, { childList: true }),
			noop
		);
		try {
			list.append(document.createElement('li'));
			await settle();

			expect(callback).toHaveBeenCalledOnce();
			const records = callback.mock.calls[0]?.[0] as MutationRecord[];
			expect(records[0]?.type).toBe('childList');
			expect(records[0]?.target).toBe(list);
		} finally {
			await dispose();
			list.remove();
		}
	});

	it('passes native options through', async () => {
		const el = document.createElement('div');
		el.setAttribute('data-a', '1');
		document.body.append(el);

		const callback = vi.fn();
		const { dispose } = await mountInitialized(
			() => useMutationObserver(el, callback, { attributes: true, attributeOldValue: true }),
			noop
		);
		try {
			el.setAttribute('data-a', '2');
			await settle();

			const records = callback.mock.calls[0]?.[0] as MutationRecord[];
			expect(records[0]?.type).toBe('attributes');
			// `attributeOldValue` is the whole point of passing options through.
			expect(records[0]?.oldValue).toBe('1');
		} finally {
			await dispose();
			el.remove();
		}
	});

	it('watches a subtree only when asked', async () => {
		const parent = document.createElement('div');
		const child = document.createElement('span');
		parent.append(child);
		document.body.append(parent);

		const shallow = vi.fn();
		const deep = vi.fn();
		const { dispose } = await mountSetup(() => {
			useMutationObserver(parent, shallow, { childList: true });
			useMutationObserver(parent, deep, { childList: true, subtree: true });
		});
		try {
			child.append(document.createElement('em'));
			await settle();

			expect(shallow).not.toHaveBeenCalled();
			expect(deep).toHaveBeenCalledOnce();
		} finally {
			await dispose();
			parent.remove();
		}
	});

	it('starts observing when a getter target resolves later', async () => {
		const host = document.createElement('div');
		document.body.append(host);
		const box = createBox<HTMLDivElement | undefined>(undefined);

		const callback = vi.fn();
		const { dispose } = await mountInitialized(
			() => useMutationObserver(() => box.value, callback, { childList: true }),
			noop
		);
		try {
			box.value = host;
			await settle();

			host.append(document.createElement('i'));
			await settle();

			expect(callback).toHaveBeenCalledOnce();
		} finally {
			await dispose();
			host.remove();
		}
	});

	it('moves observation when a getter target changes', async () => {
		const first = document.createElement('div');
		const second = document.createElement('div');
		document.body.append(first, second);
		const box = createBox<HTMLDivElement>(first);

		const callback = vi.fn();
		const { dispose } = await mountInitialized(
			() => useMutationObserver(() => box.value, callback, { childList: true }),
			noop
		);
		try {
			second.append(document.createElement('i'));
			await settle();
			expect(callback).not.toHaveBeenCalled();

			box.value = second;
			await settle();

			// The old element must be released, not left watched forever.
			first.append(document.createElement('i'));
			await settle();
			expect(callback).not.toHaveBeenCalled();

			second.append(document.createElement('b'));
			await settle();
			expect(callback).toHaveBeenCalledOnce();
		} finally {
			await dispose();
			first.remove();
			second.remove();
		}
	});

	it('watches every element of an array', async () => {
		const first = document.createElement('div');
		const second = document.createElement('div');
		document.body.append(first, second);

		const callback = vi.fn();
		const { dispose } = await mountInitialized(
			() => useMutationObserver([first, second], callback, { childList: true }),
			noop
		);
		try {
			first.append(document.createElement('i'));
			second.append(document.createElement('i'));
			await settle();

			// One batched delivery for both, since they were mutated in the same tick.
			expect(callback).toHaveBeenCalledOnce();
			expect((callback.mock.calls[0]?.[0] as MutationRecord[]).length).toBe(2);
		} finally {
			await dispose();
			first.remove();
			second.remove();
		}
	});

	it('reports each change once for a repeated element', async () => {
		const el = document.createElement('div');
		document.body.append(el);

		const callback = vi.fn();
		const { dispose } = await mountInitialized(
			() => useMutationObserver([el, el], callback, { childList: true }),
			noop
		);
		try {
			el.append(document.createElement('i'));
			await settle();

			// Observing the same element twice would deliver two records here.
			expect((callback.mock.calls[0]?.[0] as MutationRecord[]).length).toBe(1);
		} finally {
			await dispose();
			el.remove();
		}
	});

	it('observes nothing while the target is nullish', async () => {
		const callback = vi.fn();
		const { dispose } = await mountInitialized(
			() => useMutationObserver(null, callback, { childList: true }),
			noop
		);
		try {
			document.body.append(document.createElement('i'));
			await settle();

			expect(callback).not.toHaveBeenCalled();
		} finally {
			await dispose();
		}
	});

	it('takes queued records before they are delivered', async () => {
		const el = document.createElement('div');
		document.body.append(el);

		const callback = vi.fn();
		const { api, dispose } = await mountInitialized(
			() => useMutationObserver(el, callback, { childList: true }),
			noop
		);
		try {
			el.append(document.createElement('i'));

			const queued = api.takeRecords();
			expect(queued?.length).toBe(1);

			await settle();
			// Draining the queue is what stopped the delivery.
			expect(callback).not.toHaveBeenCalled();
		} finally {
			await dispose();
			el.remove();
		}
	});

	it('reports no queued records once stopped', async () => {
		const el = document.createElement('div');
		const { api, dispose } = await mountInitialized(
			() => useMutationObserver(el, noop, { childList: true }),
			noop
		);
		try {
			api.stop();
			expect(api.takeRecords()).toBeUndefined();
		} finally {
			await dispose();
		}
	});

	it('stops observing and does not resume on a target change', async () => {
		const first = document.createElement('div');
		const second = document.createElement('div');
		document.body.append(first, second);
		const box = createBox<HTMLDivElement>(first);

		const callback = vi.fn();
		const { api, dispose } = await mountInitialized(
			() => useMutationObserver(() => box.value, callback, { childList: true }),
			noop
		);
		try {
			api.stop();

			box.value = second;
			await settle();

			second.append(document.createElement('i'));
			await settle();

			expect(callback).not.toHaveBeenCalled();
		} finally {
			await dispose();
			first.remove();
			second.remove();
		}
	});

	it('is idempotent', async () => {
		const el = document.createElement('div');
		const { api, dispose } = await mountInitialized(
			() => useMutationObserver(el, noop, { childList: true }),
			noop
		);
		try {
			api.stop();
			expect(() => api.stop()).not.toThrow();
		} finally {
			await dispose();
		}
	});

	it('disconnects on unmount', async () => {
		const el = document.createElement('div');
		document.body.append(el);

		const callback = vi.fn();
		const { dispose } = await mountInitialized(
			() => useMutationObserver(el, callback, { childList: true }),
			noop
		);
		await dispose();

		el.append(document.createElement('i'));
		await settle();

		// Nothing to write to after teardown: the observer is gone.
		expect(callback).not.toHaveBeenCalled();
	});
});
