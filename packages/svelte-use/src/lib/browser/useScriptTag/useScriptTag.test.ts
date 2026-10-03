// @vitest-environment jsdom
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mountInitialized } from '../../../../test/fixtures/mount.ts';
import { useScriptTag } from './index.ts';

const SRC = 'https://cdn.example/lib.js';

const noop = () => {};

/** jsdom does not fetch external scripts, so load/error are dispatched by hand. */
function fire(el: Element, type: string): void {
	el.dispatchEvent(new Event(type));
}

const injected = (): HTMLScriptElement[] => [
	...document.head.querySelectorAll(`script[src="${SRC}"]`)
];

afterEach(() => {
	for (const el of injected()) el.remove();
});

describe('useScriptTag', () => {
	it('injects the script on mount', async () => {
		const { api, dispose } = await mountInitialized(() => useScriptTag(SRC), noop);
		try {
			await tick();
			const els = injected();
			expect(els).toHaveLength(1);
			expect(els[0]?.type).toBe('text/javascript');
			expect(els[0]?.async).toBe(true);
			expect(api.scriptTag).toBe(els[0]);
		} finally {
			await dispose();
		}
	});

	it('resolves on the load event and marks the element', async () => {
		const onLoaded = vi.fn();
		const { api, dispose } = await mountInitialized(() => useScriptTag(SRC, onLoaded), noop);
		try {
			await tick();
			const el = api.scriptTag;
			expect(el).toBeDefined();

			const settled = vi.fn();
			void api.load().then(settled);
			await tick();
			expect(settled).not.toHaveBeenCalled();

			fire(el!, 'load');
			await tick();

			expect(el?.getAttribute('data-loaded')).toBe('true');
			expect(onLoaded).toHaveBeenCalledWith(el);
			expect(settled).toHaveBeenCalled();
		} finally {
			await dispose();
		}
	});

	it('resolves without waiting when asked not to', async () => {
		const { api, dispose } = await mountInitialized(
			() => useScriptTag(SRC, undefined, { manual: true }),
			noop
		);
		try {
			await expect(api.load(false)).resolves.toBe(api.scriptTag);
		} finally {
			await dispose();
		}
	});

	it('keeps waiting after an auto-load even when a later call asks not to', async () => {
		const { api, dispose } = await mountInitialized(() => useScriptTag(SRC), noop);
		try {
			await tick();
			// Mount already started a waiting load, and the in-flight promise is
			// memoized per cycle — `load(false)` must not downgrade it, or a caller
			// could be told the script is ready before it is.
			const pending = api.load(false);
			const settled = vi.fn();
			void pending.then(settled);
			await tick();
			expect(settled).not.toHaveBeenCalled();

			fire(api.scriptTag!, 'load');
			await tick();
			expect(settled).toHaveBeenCalled();
		} finally {
			await dispose();
		}
	});

	it('injects one element for repeated load calls', async () => {
		const { api, dispose } = await mountInitialized(
			() => useScriptTag(SRC, undefined, { manual: true }),
			noop
		);
		try {
			const first = api.load(false);
			const second = api.load(false);
			// Same promise: the util memoizes per load/unload cycle.
			expect(second).toBe(first);
			await tick();
			expect(injected()).toHaveLength(1);
		} finally {
			await dispose();
		}
	});

	it('adopts an element already in the document instead of duplicating it', async () => {
		const existing = document.createElement('script');
		existing.src = SRC;
		existing.setAttribute('data-loaded', 'true');
		document.head.appendChild(existing);

		const { api, dispose } = await mountInitialized(() => useScriptTag(SRC), noop);
		try {
			await tick();
			expect(injected()).toHaveLength(1);
			expect(api.scriptTag).toBe(existing);
			// Already loaded: resolves without waiting for an event that fired long
			// ago, which would otherwise hang forever.
			await expect(api.load()).resolves.toBe(existing);
		} finally {
			await dispose();
		}
	});

	it('rejects on the error event', async () => {
		const { api, dispose } = await mountInitialized(
			() => useScriptTag(SRC, undefined, { manual: true }),
			noop
		);
		try {
			const pending = api.load();
			await tick();
			fire(api.scriptTag!, 'error');
			await expect(pending).rejects.toBeInstanceOf(Event);
		} finally {
			await dispose();
		}
	});

	it('rejects on the abort event', async () => {
		const { api, dispose } = await mountInitialized(
			() => useScriptTag(SRC, undefined, { manual: true }),
			noop
		);
		try {
			const pending = api.load();
			await tick();
			fire(api.scriptTag!, 'abort');
			await expect(pending).rejects.toBeInstanceOf(Event);
		} finally {
			await dispose();
		}
	});

	it('ignores a load event that arrives after a failure', async () => {
		const onLoaded = vi.fn();
		const { api, dispose } = await mountInitialized(
			() => useScriptTag(SRC, onLoaded, { manual: true }),
			noop
		);
		try {
			const pending = api.load();
			await tick();
			const el = api.scriptTag!;
			fire(el, 'error');
			fire(el, 'load');
			await tick();

			// The first event to settle owns the promise; a retry after a failure
			// must not also report success.
			expect(onLoaded).not.toHaveBeenCalled();
			await expect(pending).rejects.toBeInstanceOf(Event);
		} finally {
			await dispose();
		}
	});

	it('removes the element on unmount', async () => {
		const { dispose } = await mountInitialized(() => useScriptTag(SRC), noop);
		await tick();
		expect(injected()).toHaveLength(1);

		await dispose();
		expect(injected()).toHaveLength(0);
	});

	it('unload allows a later load to inject again', async () => {
		const { api, dispose } = await mountInitialized(
			() => useScriptTag(SRC, undefined, { manual: true }),
			noop
		);
		try {
			await api.load(false);
			expect(injected()).toHaveLength(1);

			api.unload();
			expect(injected()).toHaveLength(0);
			expect(api.scriptTag).toBeUndefined();

			await api.load(false);
			expect(injected()).toHaveLength(1);
		} finally {
			await dispose();
		}
	});

	describe('manual', () => {
		it('injects nothing on mount and survives unmount', async () => {
			const { api, dispose } = await mountInitialized(
				() => useScriptTag(SRC, undefined, { manual: true }),
				noop
			);
			await tick();
			expect(injected()).toHaveLength(0);

			await api.load(false);
			expect(injected()).toHaveLength(1);

			await dispose();
			expect(injected()).toHaveLength(1);

			api.unload();
			expect(injected()).toHaveLength(0);
		});

		it('is loadable from a plain handler, with no effect context', async () => {
			// The trap: routing the load/error listeners through `useEventListener`
			// creates an `$effect` from a promise executor, which throws outside an
			// effect root.
			const { api, dispose } = await mountInitialized(
				() => useScriptTag(SRC, undefined, { manual: true }),
				noop
			);
			try {
				const pending = api.load();
				await tick();
				fire(api.scriptTag!, 'load');
				await expect(pending).resolves.toBe(api.scriptTag);
			} finally {
				await dispose();
			}
		});
	});

	it('injects nothing when immediate is false', async () => {
		const { api, dispose } = await mountInitialized(
			() => useScriptTag(SRC, undefined, { immediate: false }),
			noop
		);
		try {
			await tick();
			expect(injected()).toHaveLength(0);
			await api.load(false);
			expect(injected()).toHaveLength(1);
		} finally {
			await dispose();
		}
	});

	it('applies the element options', async () => {
		const { api, dispose } = await mountInitialized(
			() =>
				useScriptTag(SRC, undefined, {
					manual: true,
					type: 'module',
					async: false,
					defer: true,
					noModule: true,
					crossOrigin: 'anonymous',
					referrerPolicy: 'no-referrer',
					nonce: 'n0nce',
					attrs: { 'data-testid': 'lib', 'data-build': '42' }
				}),
			noop
		);
		try {
			await api.load(false);
			const el = api.scriptTag!;
			expect(el.type).toBe('module');
			expect(el.async).toBe(false);
			expect(el.defer).toBe(true);
			expect(el.noModule).toBe(true);
			expect(el.crossOrigin).toBe('anonymous');
			expect(el.referrerPolicy).toBe('no-referrer');
			expect(el.getAttribute('nonce')).toBe('n0nce');
			expect(el.getAttribute('data-testid')).toBe('lib');
			expect(el.getAttribute('data-build')).toBe('42');
		} finally {
			await dispose();
		}
	});

	it('resolves a getter src at load time', async () => {
		let src = SRC;
		const { api, dispose } = await mountInitialized(
			() => useScriptTag(() => src, undefined, { manual: true }),
			noop
		);
		try {
			src = 'https://cdn.example/other.js';
			await api.load(false);
			expect(api.scriptTag?.getAttribute('src')).toBe('https://cdn.example/other.js');
		} finally {
			await dispose();
		}
	});

	it('reports the element through a getter', async () => {
		const seen: (HTMLScriptElement | undefined)[] = [];
		const { api, dispose } = await mountInitialized(
			() => useScriptTag(SRC, undefined, { manual: true }),
			(value) => {
				seen.push(value.scriptTag);
			}
		);
		try {
			await tick();
			expect(seen.at(-1)).toBeUndefined();

			await api.load(false);
			await tick();
			expect(seen.at(-1)).toBeDefined();
		} finally {
			await dispose();
		}
	});
});
