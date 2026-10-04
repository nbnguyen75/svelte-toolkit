// @vitest-environment jsdom
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountInitialized } from '../../../../test/fixtures/mount.ts';
import { MockIntersectionObserver } from '../../../../test/fixtures/observers.ts';
import { useElementVisibility } from './index.ts';

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

describe('useElementVisibility', () => {
	it('reports false before anything intersects', async () => {
		const el = box();
		const { api, dispose } = await mountInitialized(() => useElementVisibility(el), noop);
		try {
			expect(api.isVisible).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('reports the given initialValue', async () => {
		const el = box();
		const { api, dispose } = await mountInitialized(
			() => useElementVisibility(el, { initialValue: true }),
			noop
		);
		try {
			expect(api.isVisible).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('becomes visible when the element intersects', async () => {
		const el = box();
		const { api, dispose } = await mountInitialized(() => useElementVisibility(el), noop);
		try {
			MockIntersectionObserver.triggerIntersecting(el, true);
			expect(api.isVisible).toBe(true);

			MockIntersectionObserver.triggerIntersecting(el, false);
			expect(api.isVisible).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('keeps the latest entry of a batched delivery', async () => {
		const el = box();
		const { api, dispose } = await mountInitialized(() => useElementVisibility(el), noop);
		try {
			// The element crossed a threshold mid-batch, so entries disagree.
			MockIntersectionObserver.trigger(el, [
				{ isIntersecting: true, time: 100 },
				{ isIntersecting: false, time: 300 }
			]);
			expect(api.isVisible).toBe(false);

			MockIntersectionObserver.trigger(el, [
				{ isIntersecting: false, time: 100 },
				{ isIntersecting: true, time: 300 }
			]);
			expect(api.isVisible).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('re-runs a reading effect when visibility changes', async () => {
		const el = box();
		// `read` runs inside an effect, so this pins the getter as reactive
		// state rather than a value snapshotted at mount.
		const seen: boolean[] = [];
		const { dispose } = await mountInitialized(
			() => useElementVisibility(el),
			(api) => {
				seen.push(api.isVisible);
			}
		);
		try {
			expect(seen).toEqual([false]);

			MockIntersectionObserver.triggerIntersecting(el, true);
			await tick();

			expect(seen).toEqual([false, true]);
		} finally {
			await dispose();
		}
	});

	it('keeps the value alone when the report matches it', async () => {
		const el = box();
		const { api, dispose } = await mountInitialized(
			() => useElementVisibility(el, { initialValue: true }),
			noop
		);
		try {
			MockIntersectionObserver.triggerIntersecting(el, true);
			expect(api.isVisible).toBe(true);

			MockIntersectionObserver.triggerIntersecting(el, false);
			expect(api.isVisible).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('scopes visibility to a scroll container', async () => {
		const scroller = box();
		const el = box();
		const { api, dispose } = await mountInitialized(
			() => useElementVisibility(el, { scrollTarget: scroller }),
			noop
		);
		try {
			expect(MockIntersectionObserver.instances[0]?.init?.root).toBe(scroller);

			MockIntersectionObserver.triggerIntersecting(el, true);
			expect(api.isVisible).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('starts tracking a target that resolves later', async () => {
		const el = box();
		const source = createBox<HTMLDivElement | undefined>(undefined);
		const { api, dispose } = await mountInitialized(
			() => useElementVisibility(() => source.value),
			noop
		);
		try {
			expect(MockIntersectionObserver.instances).toHaveLength(0);

			source.value = el;
			await Promise.resolve();

			MockIntersectionObserver.triggerIntersecting(el, true);
			expect(api.isVisible).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('keeps tracking a nullish target without throwing', async () => {
		const { api, dispose } = await mountInitialized(() => useElementVisibility(null), noop);
		try {
			expect(api.isVisible).toBe(false);
			expect(MockIntersectionObserver.instances).toHaveLength(0);
		} finally {
			await dispose();
		}
	});

	it('stops observing on demand', async () => {
		const el = box();
		const { api, dispose } = await mountInitialized(() => useElementVisibility(el), noop);
		try {
			api.stop();
			expect(MockIntersectionObserver.instances).toHaveLength(0);

			MockIntersectionObserver.triggerIntersecting(el, true);
			expect(api.isVisible).toBe(false);
		} finally {
			await dispose();
		}
	});

	describe('once', () => {
		it('stops after the first visibility change', async () => {
			const el = box();
			const { api, dispose } = await mountInitialized(
				() => useElementVisibility(el, { once: true }),
				noop
			);
			try {
				MockIntersectionObserver.triggerIntersecting(el, true);

				expect(api.isVisible).toBe(true);
				expect(MockIntersectionObserver.instances).toHaveLength(0);
			} finally {
				await dispose();
			}
		});

		it('does not let the initial report consume it', async () => {
			const el = box();
			const { api, dispose } = await mountInitialized(
				() => useElementVisibility(el, { once: true }),
				noop
			);
			try {
				// The platform reports once on observe; reporting "not visible" is
				// not a change, so a below-the-fold element still gets seen.
				MockIntersectionObserver.triggerIntersecting(el, false);
				expect(MockIntersectionObserver.instances).toHaveLength(1);

				MockIntersectionObserver.triggerIntersecting(el, true);
				expect(api.isVisible).toBe(true);
				expect(MockIntersectionObserver.instances).toHaveLength(0);
			} finally {
				await dispose();
			}
		});

		it('keeps watching without once', async () => {
			const el = box();
			const { api, dispose } = await mountInitialized(() => useElementVisibility(el), noop);
			try {
				MockIntersectionObserver.triggerIntersecting(el, true);
				MockIntersectionObserver.triggerIntersecting(el, false);
				MockIntersectionObserver.triggerIntersecting(el, true);

				expect(api.isVisible).toBe(true);
				expect(MockIntersectionObserver.instances).toHaveLength(1);
			} finally {
				await dispose();
			}
		});
	});
});
