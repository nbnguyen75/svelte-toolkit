// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountInitialized } from '../../../../test/fixtures/mount.ts';
import { MockIntersectionObserver } from '../../../../test/fixtures/observers.ts';
import { useIntersectionObserver } from './index.ts';

const noop = () => {};

beforeEach(() => {
	MockIntersectionObserver.install();
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

describe('useIntersectionObserver', () => {
	it('delivers a native callback for the target', async () => {
		const el = box();
		const callback = vi.fn();
		const { dispose } = await mountInitialized(() => useIntersectionObserver(el, callback), noop);
		try {
			MockIntersectionObserver.triggerIntersecting(el, true);

			expect(callback).toHaveBeenCalledOnce();
			const entries = callback.mock.calls[0]?.[0] as IntersectionObserverEntry[];
			expect(entries[0]?.target).toBe(el);
			expect(entries[0]?.isIntersecting).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('defaults to the viewport root with a zero margin and threshold', async () => {
		const el = box();
		const { dispose } = await mountInitialized(() => useIntersectionObserver(el, noop), noop);
		try {
			expect(MockIntersectionObserver.instances[0]?.init).toEqual({
				root: null,
				rootMargin: '0px',
				threshold: 0
			});
		} finally {
			await dispose();
		}
	});

	it('passes root, rootMargin and threshold through', async () => {
		const root = box();
		const el = box();
		const { dispose } = await mountInitialized(
			() =>
				useIntersectionObserver(el, noop, {
					root,
					rootMargin: '20px',
					threshold: [0, 0.5, 1]
				}),
			noop
		);
		try {
			expect(MockIntersectionObserver.instances[0]?.init).toEqual({
				root,
				rootMargin: '20px',
				threshold: [0, 0.5, 1]
			});
		} finally {
			await dispose();
		}
	});

	it('accepts a document as the root', async () => {
		const el = box();
		const { dispose } = await mountInitialized(
			() => useIntersectionObserver(el, noop, { root: document }),
			noop
		);
		try {
			expect(MockIntersectionObserver.instances[0]?.init?.root).toBe(document);
		} finally {
			await dispose();
		}
	});

	it('reads a root from a getter and re-observes when it changes', async () => {
		const first = box();
		const second = box();
		const root = createBox<Element>(first);
		const el = box();
		const { dispose } = await mountInitialized(
			() => useIntersectionObserver(el, noop, { root: () => root.value }),
			noop
		);
		try {
			expect(MockIntersectionObserver.instances[0]?.init?.root).toBe(first);

			root.value = second;
			await Promise.resolve();

			expect(MockIntersectionObserver.instances[0]?.init?.root).toBe(second);
		} finally {
			await dispose();
		}
	});

	it('reads rootMargin from a getter', async () => {
		const el = box();
		const margin = createBox('0px');
		const { dispose } = await mountInitialized(
			() => useIntersectionObserver(el, noop, { rootMargin: () => margin.value }),
			noop
		);
		try {
			expect(MockIntersectionObserver.instances[0]?.init?.rootMargin).toBe('0px');

			margin.value = '10px 0px';
			await Promise.resolve();

			expect(MockIntersectionObserver.instances[0]?.init?.rootMargin).toBe('10px 0px');
		} finally {
			await dispose();
		}
	});

	it('observes every element of an array', async () => {
		const first = box();
		const second = box();
		const { dispose } = await mountInitialized(
			() => useIntersectionObserver([first, second], noop),
			noop
		);
		try {
			expect(MockIntersectionObserver.instances).toHaveLength(1);
			expect(MockIntersectionObserver.instances[0]?.observed).toEqual([first, second]);
		} finally {
			await dispose();
		}
	});

	it('observes nothing while the target is nullish', async () => {
		const { dispose } = await mountInitialized(() => useIntersectionObserver(null, noop), noop);
		try {
			expect(MockIntersectionObserver.instances).toHaveLength(0);
		} finally {
			await dispose();
		}
	});

	it('starts observing when a getter target resolves later', async () => {
		const el = box();
		const source = createBox<HTMLDivElement | undefined>(undefined);
		const { dispose } = await mountInitialized(
			() => useIntersectionObserver(() => source.value, noop),
			noop
		);
		try {
			expect(MockIntersectionObserver.instances).toHaveLength(0);

			source.value = el;
			await Promise.resolve();

			expect(MockIntersectionObserver.instances[0]?.observed).toEqual([el]);
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
			() => useIntersectionObserver(() => source.value, callback),
			noop
		);
		try {
			source.value = second;
			await Promise.resolve();

			MockIntersectionObserver.triggerIntersecting(first, true);
			expect(callback).not.toHaveBeenCalled();

			MockIntersectionObserver.triggerIntersecting(second, true);
			expect(callback).toHaveBeenCalledOnce();
		} finally {
			await dispose();
		}
	});

	it('observes nothing when immediate is false', async () => {
		const el = box();
		const { api, dispose } = await mountInitialized(
			() => useIntersectionObserver(el, noop, { immediate: false }),
			noop
		);
		try {
			expect(api.isActive).toBe(false);
			expect(MockIntersectionObserver.instances).toHaveLength(0);
		} finally {
			await dispose();
		}
	});

	it('resumes an immediate-false util on demand', async () => {
		const el = box();
		const { api, dispose } = await mountInitialized(
			() => useIntersectionObserver(el, noop, { immediate: false }),
			noop
		);
		try {
			api.resume();
			await Promise.resolve();

			expect(api.isActive).toBe(true);
			expect(MockIntersectionObserver.instances[0]?.observed).toEqual([el]);
		} finally {
			await dispose();
		}
	});

	it('pauses without giving up the ability to resume', async () => {
		const el = box();
		const callback = vi.fn();
		const { api, dispose } = await mountInitialized(
			() => useIntersectionObserver(el, callback),
			noop
		);
		try {
			api.pause();
			await Promise.resolve();

			expect(api.isActive).toBe(false);
			expect(MockIntersectionObserver.instances).toHaveLength(0);

			MockIntersectionObserver.triggerIntersecting(el, true);
			expect(callback).not.toHaveBeenCalled();

			api.resume();
			await Promise.resolve();

			expect(MockIntersectionObserver.instances).toHaveLength(1);
			MockIntersectionObserver.triggerIntersecting(el, true);
			expect(callback).toHaveBeenCalledOnce();
		} finally {
			await dispose();
		}
	});

	it('stops permanently: resume does not undo it', async () => {
		const el = box();
		const { api, dispose } = await mountInitialized(() => useIntersectionObserver(el, noop), noop);
		try {
			api.stop();
			api.resume();
			await Promise.resolve();

			expect(api.isActive).toBe(false);
			expect(MockIntersectionObserver.instances).toHaveLength(0);
		} finally {
			await dispose();
		}
	});

	it('does not resurrect on a target change after stop', async () => {
		const first = box();
		const second = box();
		const source = createBox<HTMLDivElement>(first);
		const { api, dispose } = await mountInitialized(
			() => useIntersectionObserver(() => source.value, noop),
			noop
		);
		try {
			api.stop();

			source.value = second;
			await Promise.resolve();

			expect(MockIntersectionObserver.instances).toHaveLength(0);
		} finally {
			await dispose();
		}
	});

	it('is idempotent', async () => {
		const el = box();
		const { api, dispose } = await mountInitialized(() => useIntersectionObserver(el, noop), noop);
		try {
			api.stop();
			expect(() => api.stop()).not.toThrow();
			expect(() => api.pause()).not.toThrow();
		} finally {
			await dispose();
		}
	});

	it('disconnects on unmount', async () => {
		const el = box();
		const { dispose } = await mountInitialized(() => useIntersectionObserver(el, noop), noop);
		await dispose();

		expect(MockIntersectionObserver.instances).toHaveLength(0);
	});

	it('reports no support when IntersectionObserver is missing', async () => {
		const saved = window.IntersectionObserver;
		// @ts-expect-error - deliberately removing the global to prove the guard.
		delete window.IntersectionObserver;
		try {
			const el = box();
			const { api, dispose } = await mountInitialized(
				() => useIntersectionObserver(el, noop),
				noop
			);
			try {
				expect(api.isSupported).toBe(false);
				expect(MockIntersectionObserver.instances).toHaveLength(0);
			} finally {
				await dispose();
			}
		} finally {
			window.IntersectionObserver = saved;
		}
	});
});
