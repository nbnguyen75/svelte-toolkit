// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mountUtil } from '../../../../test/fixtures/mount.ts';
import type { UseElementHoverOptions } from './index.ts';
import { useElementHover } from './index.ts';

type HoverApi = { readonly value: boolean };

async function mountHover(
	element: Element | null,
	options?: UseElementHoverOptions
): Promise<{ api: HoverApi; dispose: () => Promise<void> }> {
	return mountUtil(() => useElementHover(() => element, options));
}

describe('useElementHover', () => {
	const created: Element[] = [];

	function track(): HTMLElement {
		const el = document.createElement('div');
		document.body.append(el);
		created.push(el);
		return el;
	}

	function enter(el: Element): void {
		el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
	}

	function leave(el: Element): void {
		el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
	}

	afterEach(() => {
		for (const el of created.splice(0)) el.remove();
	});

	describe('defaults', () => {
		it('starts not hovered', async () => {
			const el = track();
			const { api, dispose } = await mountHover(el);
			try {
				expect(api.value).toBe(false);
			} finally {
				await dispose();
			}
		});

		it('flips on mouseenter and back on mouseleave', async () => {
			const el = track();
			const { api, dispose } = await mountHover(el);
			try {
				enter(el);
				expect(api.value).toBe(true);

				leave(el);
				expect(api.value).toBe(false);
			} finally {
				await dispose();
			}
		});

		it('ignores repeated enter events', async () => {
			const el = track();
			const { api, dispose } = await mountHover(el);
			try {
				enter(el);
				enter(el);
				expect(api.value).toBe(true);

				leave(el);
				expect(api.value).toBe(false);
			} finally {
				await dispose();
			}
		});

		it('ignores a leave with no prior enter', async () => {
			const el = track();
			const { api, dispose } = await mountHover(el);
			try {
				leave(el);
				expect(api.value).toBe(false);
			} finally {
				await dispose();
			}
		});

		it('does not react to mouseover, which fires for descendants', async () => {
			const el = track();
			const child = document.createElement('span');
			el.append(child);
			const { api, dispose } = await mountHover(el);
			try {
				child.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
				expect(api.value).toBe(false);
			} finally {
				await dispose();
			}
		});

		it('attaches nothing for a null element', async () => {
			const { api, dispose } = await mountHover(null);
			try {
				window.dispatchEvent(new MouseEvent('mouseenter'));
				expect(api.value).toBe(false);
			} finally {
				await dispose();
			}
		});

		it('accepts a bare element', async () => {
			const el = track();
			const { api, dispose } = await mountUtil(() => useElementHover(el));
			try {
				enter(el);
				expect(api.value).toBe(true);
			} finally {
				await dispose();
			}
		});
	});

	describe('delays', () => {
		it('waits for delayEnter before reporting hover', async () => {
			vi.useFakeTimers();
			try {
				const el = track();
				const { api, dispose } = await mountHover(el, { delayEnter: 200 });
				try {
					enter(el);
					expect(api.value).toBe(false);

					vi.advanceTimersByTime(199);
					expect(api.value).toBe(false);

					vi.advanceTimersByTime(1);
					expect(api.value).toBe(true);
				} finally {
					await dispose();
				}
			} finally {
				vi.useRealTimers();
			}
		});

		it('waits for delayLeave before reporting the pointer left', async () => {
			vi.useFakeTimers();
			try {
				const el = track();
				const { api, dispose } = await mountHover(el, { delayLeave: 300 });
				try {
					enter(el);
					expect(api.value).toBe(true);

					leave(el);
					expect(api.value).toBe(true);

					vi.advanceTimersByTime(300);
					expect(api.value).toBe(false);
				} finally {
					await dispose();
				}
			} finally {
				vi.useRealTimers();
			}
		});

		it('cancels a pending enter when the pointer leaves', async () => {
			vi.useFakeTimers();
			try {
				const el = track();
				const { api, dispose } = await mountHover(el, { delayEnter: 200 });
				try {
					enter(el);
					vi.advanceTimersByTime(150);
					expect(api.value).toBe(false);

					leave(el);
					vi.advanceTimersByTime(500);

					// The delayed enter never lands, so the element is not hovered.
					expect(api.value).toBe(false);
				} finally {
					await dispose();
				}
			} finally {
				vi.useRealTimers();
			}
		});

		it('cancels a pending leave when the pointer comes back', async () => {
			vi.useFakeTimers();
			try {
				const el = track();
				const { api, dispose } = await mountHover(el, { delayLeave: 300 });
				try {
					enter(el);
					leave(el);
					vi.advanceTimersByTime(200);
					expect(api.value).toBe(true);

					enter(el);
					vi.advanceTimersByTime(500);
					expect(api.value).toBe(true);
				} finally {
					await dispose();
				}
			} finally {
				vi.useRealTimers();
			}
		});

		it('applies the latest of two rapid enters', async () => {
			vi.useFakeTimers();
			try {
				const el = track();
				const { api, dispose } = await mountHover(el, { delayEnter: 100 });
				try {
					enter(el);
					vi.advanceTimersByTime(50);
					enter(el);

					// The first timer is cancelled, so only one flip happens, 100ms
					// after the *second* enter.
					vi.advanceTimersByTime(50);
					expect(api.value).toBe(false);

					vi.advanceTimersByTime(50);
					expect(api.value).toBe(true);
				} finally {
					await dispose();
				}
			} finally {
				vi.useRealTimers();
			}
		});
	});

	describe('triggerOnRemoval', () => {
		it('reports not hovered when the element is removed', async () => {
			const el = track();
			const { api, dispose } = await mountHover(el, { triggerOnRemoval: true });
			try {
				enter(el);
				expect(api.value).toBe(true);

				el.remove();
				// The mutation observer delivers asynchronously.
				await Promise.resolve();
				expect(api.value).toBe(false);
			} finally {
				await dispose();
			}
		});

		it('reports not hovered when an ancestor is removed', async () => {
			const el = track();
			const wrapper = document.createElement('section');
			document.body.append(wrapper);
			wrapper.append(el);
			const { api, dispose } = await mountHover(el, { triggerOnRemoval: true });
			try {
				enter(el);
				expect(api.value).toBe(true);

				wrapper.remove();
				await Promise.resolve();
				expect(api.value).toBe(false);
			} finally {
				await dispose();
				wrapper.remove();
			}
		});

		it('ignores an unrelated removal', async () => {
			const el = track();
			const other = track();
			const { api, dispose } = await mountHover(el, { triggerOnRemoval: true });
			try {
				enter(el);

				other.remove();
				await Promise.resolve();

				expect(api.value).toBe(true);
			} finally {
				await dispose();
			}
		});

		it('stays hovered without the option', async () => {
			const el = track();
			const { api, dispose } = await mountHover(el);
			try {
				enter(el);
				el.remove();
				await Promise.resolve();

				// No observer is attached, so nothing notices the removal.
				expect(api.value).toBe(true);
			} finally {
				await dispose();
			}
		});
	});

	describe('cleanup', () => {
		it('stops listening after unmount', async () => {
			const el = track();
			const { api, dispose } = await mountHover(el);
			await dispose();

			enter(el);
			expect(api.value).toBe(false);
		});

		it('cancels a pending delay on unmount', async () => {
			vi.useFakeTimers();
			try {
				const el = track();
				const { api, dispose } = await mountHover(el, { delayEnter: 500 });
				enter(el);
				expect(api.value).toBe(false);

				await dispose();
				vi.advanceTimersByTime(1000);

				// The delayed enter was cancelled, so nothing flipped.
				expect(api.value).toBe(false);
			} finally {
				vi.useRealTimers();
			}
		});

		it('leaves no pending timer after a completed toggle', async () => {
			vi.useFakeTimers();
			try {
				const el = track();
				const { api, dispose } = await mountHover(el, { delayEnter: 100 });
				try {
					enter(el);
					vi.advanceTimersByTime(100);
					expect(api.value).toBe(true);

					// A settled timer must not be able to fire again.
					vi.advanceTimersByTime(1000);
					expect(api.value).toBe(true);
				} finally {
					await dispose();
				}
			} finally {
				vi.useRealTimers();
			}
		});
	});

	describe('surface', () => {
		it('exposes exactly value', async () => {
			const el = track();
			const { api, dispose } = await mountHover(el);
			try {
				expect(Object.keys(api)).toEqual(['value']);
			} finally {
				await dispose();
			}
		});
	});
});
