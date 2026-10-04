// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountInitialized, mountSetup } from '../../../../test/fixtures/mount.ts';
import { MockResizeObserver } from '../../../../test/fixtures/observers.ts';
import { useResizeObserver } from './index.ts';

const noop = () => {};

beforeEach(() => {
	MockResizeObserver.install();
});

const created: Element[] = [];

function box(): HTMLDivElement {
	const el = document.createElement('div');
	document.body.append(el);
	created.push(el);
	return el;
}

afterEach(() => {
	for (const el of created.splice(0)) el.remove();
});

describe('useResizeObserver', () => {
	it('delivers a native callback for the target', async () => {
		const el = box();
		const callback = vi.fn();
		const { dispose } = await mountInitialized(() => useResizeObserver(el, callback), noop);
		try {
			MockResizeObserver.triggerFor(el, { contentRect: { width: 300, height: 40 } });

			expect(callback).toHaveBeenCalledOnce();
			const entries = callback.mock.calls[0]?.[0] as ResizeObserverEntry[];
			expect(entries[0]?.target).toBe(el);
			expect(entries[0]?.contentRect.width).toBe(300);
		} finally {
			await dispose();
		}
	});

	it('passes native options through to observe', async () => {
		const el = box();
		const observe = vi.spyOn(MockResizeObserver.prototype, 'observe');
		const { dispose } = await mountInitialized(
			() => useResizeObserver(el, noop, { box: 'border-box' }),
			noop
		);
		try {
			expect(observe).toHaveBeenCalledWith(el, { box: 'border-box' });
		} finally {
			await dispose();
		}
	});

	it('observes every element of an array', async () => {
		const first = box();
		const second = box();
		const { dispose } = await mountInitialized(
			() => useResizeObserver([first, second], noop),
			noop
		);
		try {
			expect(MockResizeObserver.observedCount()).toBe(2);
		} finally {
			await dispose();
		}
	});

	it('observes a repeated element once', async () => {
		const el = box();
		const { dispose } = await mountInitialized(() => useResizeObserver([el, el], noop), noop);
		try {
			// Two observations would report every resize twice.
			expect(MockResizeObserver.observedCount()).toBe(1);
		} finally {
			await dispose();
		}
	});

	it('observes nothing while the target is nullish', async () => {
		const { dispose } = await mountInitialized(() => useResizeObserver(null, noop), noop);
		try {
			expect(MockResizeObserver.observedCount()).toBe(0);
		} finally {
			await dispose();
		}
	});

	it('starts observing when a getter target resolves later', async () => {
		const el = box();
		const source = createBox<HTMLDivElement | undefined>(undefined);
		const { dispose } = await mountInitialized(
			() => useResizeObserver(() => source.value, noop),
			noop
		);
		try {
			expect(MockResizeObserver.observedCount()).toBe(0);

			source.value = el;
			await Promise.resolve();

			expect(MockResizeObserver.observedCount()).toBe(1);
		} finally {
			await dispose();
		}
	});

	it('moves observation when a getter target changes', async () => {
		const first = box();
		const second = box();
		const source = createBox<HTMLDivElement>(first);
		const callback = vi.fn();
		const { dispose } = await mountInitialized(
			() => useResizeObserver(() => source.value, callback),
			noop
		);
		try {
			source.value = second;
			await Promise.resolve();

			MockResizeObserver.triggerFor(first, { contentRect: { width: 10 } });
			expect(callback).not.toHaveBeenCalled();

			MockResizeObserver.triggerFor(second, { contentRect: { width: 20 } });
			expect(callback).toHaveBeenCalledOnce();
		} finally {
			await dispose();
		}
	});

	it('stops observing and does not resume on a target change', async () => {
		const first = box();
		const second = box();
		const source = createBox<HTMLDivElement>(first);
		const { api, dispose } = await mountInitialized(
			() => useResizeObserver(() => source.value, noop),
			noop
		);
		try {
			api.stop();
			expect(MockResizeObserver.observedCount()).toBe(0);

			source.value = second;
			await Promise.resolve();

			expect(MockResizeObserver.observedCount()).toBe(0);
		} finally {
			await dispose();
		}
	});

	it('is idempotent', async () => {
		const el = box();
		const { api, dispose } = await mountInitialized(() => useResizeObserver(el, noop), noop);
		try {
			api.stop();
			expect(() => api.stop()).not.toThrow();
		} finally {
			await dispose();
		}
	});

	it('disconnects on unmount', async () => {
		const el = box();
		const { dispose } = await mountInitialized(() => useResizeObserver(el, noop), noop);
		await dispose();

		expect(MockResizeObserver.observedCount()).toBe(0);
	});

	it('observes both targets when two utils watch one element', async () => {
		const el = box();
		const { dispose } = await mountSetup(() => {
			useResizeObserver(el, noop);
			useResizeObserver(el, noop);
		});
		try {
			// Two observers is correct: each util owns its own callback.
			expect(MockResizeObserver.instances).toHaveLength(2);
		} finally {
			await dispose();
		}
	});

	it('reports no support when ResizeObserver is missing', async () => {
		const saved = window.ResizeObserver;
		// @ts-expect-error - deliberately removing the global to prove the guard.
		delete window.ResizeObserver;
		try {
			const el = box();
			const { api, dispose } = await mountInitialized(() => useResizeObserver(el, noop), noop);
			try {
				expect(api.isSupported).toBe(false);
				expect(MockResizeObserver.observedCount()).toBe(0);
			} finally {
				await dispose();
			}
		} finally {
			window.ResizeObserver = saved;
		}
	});
});
