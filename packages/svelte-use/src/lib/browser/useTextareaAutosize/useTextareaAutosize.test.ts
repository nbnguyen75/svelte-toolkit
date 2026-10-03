// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tick } from 'svelte';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountInitialized, mountUtil } from '../../../../test/fixtures/mount.ts';
import { MockResizeObserver } from '../../../../test/fixtures/observers.ts';
import { useTextareaAutosize } from './index.ts';

const created: HTMLElement[] = [];

function area(): HTMLTextAreaElement {
	const el = document.createElement('textarea');
	document.body.append(el);
	created.push(el);
	return el;
}

/** jsdom reports `scrollHeight` as 0, so the measurement has to be stubbed. */
function withScrollHeight(el: HTMLElement, value: number): void {
	Object.defineProperty(el, 'scrollHeight', { value, configurable: true });
}

beforeEach(() => {
	MockResizeObserver.install();
});

afterEach(() => {
	for (const el of created.splice(0)) el.remove();
});

describe('useTextareaAutosize', () => {
	describe('height', () => {
		it('sets the height to the measured scrollHeight', async () => {
			const el = area();
			withScrollHeight(el, 120);
			const { dispose } = await mountUtil(() => useTextareaAutosize({ element: () => el }));
			try {
				expect(el.style.height).toBe('120px');
			} finally {
				await dispose();
			}
		});

		it('collapses the height before measuring', async () => {
			const el = area();
			// Only report the real content height while collapsed, which is exactly
			// what a browser does — so a pass that forgot the collapse reads 40.
			Object.defineProperty(el, 'scrollHeight', {
				configurable: true,
				get: () => (el.style.height === '1px' ? 120 : 40)
			});
			const { dispose } = await mountUtil(() => useTextareaAutosize({ element: () => el }));
			try {
				expect(el.style.height).toBe('120px');
			} finally {
				await dispose();
			}
		});

		it('accepts a bare element', async () => {
			const el = area();
			withScrollHeight(el, 75);
			const { dispose } = await mountUtil(() => useTextareaAutosize({ element: el }));
			try {
				expect(el.style.height).toBe('75px');
			} finally {
				await dispose();
			}
		});

		it('writes min-height when asked', async () => {
			const el = area();
			withScrollHeight(el, 90);
			const { dispose } = await mountUtil(() =>
				useTextareaAutosize({ element: () => el, styleProp: 'minHeight' })
			);
			try {
				expect(el.style.minHeight).toBe('90px');
				expect(el.style.height).toBe('');
			} finally {
				await dispose();
			}
		});
	});

	describe('maxHeight', () => {
		it('caps the applied height', async () => {
			const el = area();
			withScrollHeight(el, 400);
			const { dispose } = await mountUtil(() =>
				useTextareaAutosize({ element: () => el, maxHeight: 200 })
			);
			try {
				expect(el.style.height).toBe('200px');
			} finally {
				await dispose();
			}
		});

		it('leaves a short textarea alone', async () => {
			const el = area();
			withScrollHeight(el, 100);
			const { dispose } = await mountUtil(() =>
				useTextareaAutosize({ element: () => el, maxHeight: 300 })
			);
			try {
				expect(el.style.height).toBe('100px');
			} finally {
				await dispose();
			}
		});

		it('reports the uncapped scrollHeight even when capped', async () => {
			const el = area();
			withScrollHeight(el, 400);
			const { api, dispose } = await mountUtil(() =>
				useTextareaAutosize({ element: () => el, maxHeight: 200 })
			);
			try {
				// The getter is the measurement, not the applied style.
				expect(api.scrollHeight).toBe(400);
			} finally {
				await dispose();
			}
		});
	});

	describe('styleTarget', () => {
		it('writes the height to the target instead of the textarea', async () => {
			const el = area();
			const wrapper = document.createElement('div');
			document.body.append(wrapper);
			created.push(wrapper);
			withScrollHeight(el, 60);
			const { dispose } = await mountUtil(() =>
				useTextareaAutosize({ element: () => el, styleTarget: () => wrapper })
			);
			try {
				expect(wrapper.style.height).toBe('60px');
				// The textarea is still collapsed so the next measurement is valid.
				expect(el.style.height).toBe('1px');
			} finally {
				await dispose();
			}
		});

		it('accepts a bare target element', async () => {
			const el = area();
			const wrapper = document.createElement('div');
			document.body.append(wrapper);
			created.push(wrapper);
			withScrollHeight(el, 45);
			const { dispose } = await mountUtil(() =>
				useTextareaAutosize({ element: () => el, styleTarget: wrapper })
			);
			try {
				expect(wrapper.style.height).toBe('45px');
			} finally {
				await dispose();
			}
		});
	});

	describe('reactions', () => {
		it('re-measures when the input changes', async () => {
			const el = area();
			withScrollHeight(el, 50);
			const content = createBox('one line');
			const { dispose } = await mountUtil(() =>
				useTextareaAutosize({ element: () => el, input: () => content.value })
			);
			try {
				expect(el.style.height).toBe('50px');

				withScrollHeight(el, 150);
				content.value = 'three\nlines\nof text';
				await tick();
				expect(el.style.height).toBe('150px');
			} finally {
				await dispose();
			}
		});

		it('re-measures when maxHeight changes', async () => {
			const el = area();
			withScrollHeight(el, 400);
			const ceiling = createBox<number | undefined>(undefined);
			const { dispose } = await mountUtil(() =>
				useTextareaAutosize({
					element: () => el,
					input: () => '',
					maxHeight: () => ceiling.value
				})
			);
			try {
				expect(el.style.height).toBe('400px');

				ceiling.value = 250;
				await tick();
				expect(el.style.height).toBe('250px');
			} finally {
				await dispose();
			}
		});

		it('exposes the measurement through a getter', async () => {
			const el = area();
			withScrollHeight(el, 88);
			const { api, dispose } = await mountUtil(() => useTextareaAutosize({ element: () => el }));
			try {
				// The measurement happens in an effect, so it lands on the next tick.
				await tick();
				expect(api.scrollHeight).toBe(88);
			} finally {
				await dispose();
			}
		});
	});

	describe('onResize', () => {
		it('fires once the height is measured', async () => {
			const el = area();
			withScrollHeight(el, 100);
			const onResize = vi.fn();
			const { dispose } = await mountUtil(() =>
				useTextareaAutosize({ element: () => el, onResize })
			);
			try {
				await tick();
				expect(onResize).toHaveBeenCalled();
			} finally {
				await dispose();
			}
		});

		it('does not fire before a measurement', async () => {
			const onResize = vi.fn();
			const { dispose } = await mountUtil(() => useTextareaAutosize({ onResize }));
			try {
				await tick();
				expect(onResize).not.toHaveBeenCalled();
			} finally {
				await dispose();
			}
		});

		it('fires again when the content grows', async () => {
			const el = area();
			withScrollHeight(el, 100);
			const onResize = vi.fn();
			const content = createBox('short');
			const { dispose } = await mountUtil(() =>
				useTextareaAutosize({ element: () => el, input: () => content.value, onResize })
			);
			try {
				await tick();
				const first = onResize.mock.calls.length;

				withScrollHeight(el, 220);
				content.value = 'a much longer value';
				await tick();
				expect(onResize.mock.calls.length).toBeGreaterThan(first);
			} finally {
				await dispose();
			}
		});
	});

	describe('ResizeObserver', () => {
		it('observes the textarea', async () => {
			const el = area();
			withScrollHeight(el, 100);
			const { dispose } = await mountUtil(() => useTextareaAutosize({ element: () => el }));
			try {
				expect(MockResizeObserver.observedCount()).toBe(1);
				expect(MockResizeObserver.instances[0]?.observed[0]).toBe(el);
			} finally {
				await dispose();
			}
		});

		it('re-measures on a width change', async () => {
			const el = area();
			withScrollHeight(el, 100);
			const { dispose } = await mountUtil(() => useTextareaAutosize({ element: () => el }));
			try {
				withScrollHeight(el, 260);
				MockResizeObserver.triggerFor(el, { contentRect: { width: 300 } });
				expect(el.style.height).toBe('260px');
			} finally {
				await dispose();
			}
		});

		it('ignores a height-only notification, which is the one it caused', async () => {
			const el = area();
			withScrollHeight(el, 100);
			const onResize = vi.fn();
			const { dispose } = await mountUtil(() =>
				useTextareaAutosize({ element: () => el, onResize })
			);
			try {
				// Same width as the initial observation, different height.
				MockResizeObserver.triggerFor(el, { contentRect: { width: 0, height: 999 } });
				expect(el.style.height).toBe('100px');
			} finally {
				await dispose();
			}
		});

		it('re-measures when the width actually changes twice', async () => {
			const el = area();
			withScrollHeight(el, 100);
			const { dispose } = await mountUtil(() => useTextareaAutosize({ element: () => el }));
			try {
				MockResizeObserver.triggerFor(el, { contentRect: { width: 300 } });
				MockResizeObserver.triggerFor(el, { contentRect: { width: 300 } });
				withScrollHeight(el, 310);
				expect(el.style.height).toBe('100px');

				MockResizeObserver.triggerFor(el, { contentRect: { width: 500 } });
				expect(el.style.height).toBe('310px');
			} finally {
				await dispose();
			}
		});

		it('disconnects on unmount', async () => {
			const el = area();
			withScrollHeight(el, 100);
			const { dispose } = await mountUtil(() => useTextareaAutosize({ element: () => el }));
			await dispose();
			expect(MockResizeObserver.instances).toHaveLength(0);
		});

		it('stops measuring after unmount', async () => {
			const el = area();
			withScrollHeight(el, 100);
			const { dispose } = await mountUtil(() => useTextareaAutosize({ element: () => el }));
			await dispose();
			// No observer is left, so this cannot reach the textarea.
			el.style.height = '999px';
			MockResizeObserver.triggerFor(el, { contentRect: { width: 700 } });
			expect(el.style.height).toBe('999px');
		});

		it('does nothing without an element', async () => {
			const { dispose } = await mountUtil(() => useTextareaAutosize());
			try {
				expect(MockResizeObserver.observedCount()).toBe(0);
			} finally {
				await dispose();
			}
		});

		it('does nothing when ResizeObserver is unavailable', async () => {
			// jsdom has none; removing the mock reproduces a browser without it.
			Reflect.deleteProperty(window, 'ResizeObserver');
			const el = area();
			withScrollHeight(el, 100);
			const { dispose } = await mountUtil(() => useTextareaAutosize({ element: () => el }));
			try {
				expect(el.style.height).toBe('100px');
				expect(MockResizeObserver.observedCount()).toBe(0);
			} finally {
				await dispose();
				MockResizeObserver.install();
			}
		});
	});

	describe('triggerResize', () => {
		it('re-measures on demand', async () => {
			const el = area();
			withScrollHeight(el, 100);
			const { api, dispose } = await mountUtil(() => useTextareaAutosize({ element: () => el }));
			try {
				withScrollHeight(el, 175);
				api.triggerResize();
				expect(el.style.height).toBe('175px');
				expect(api.scrollHeight).toBe(175);
			} finally {
				await dispose();
			}
		});

		it('is a no-op without an element', async () => {
			const { api, dispose } = await mountUtil(() => useTextareaAutosize());
			try {
				expect(() => api.triggerResize()).not.toThrow();
				expect(api.scrollHeight).toBe(0);
			} finally {
				await dispose();
			}
		});
	});

	describe('usage shape', () => {
		it('measures on mount and re-reads a changing element', async () => {
			const first = area();
			const second = area();
			withScrollHeight(first, 100);
			withScrollHeight(second, 220);
			const box = createBox<HTMLTextAreaElement>(first);
			const { dispose } = await mountInitialized(
				() => useTextareaAutosize({ element: () => box.value }),
				() => {
					// Reading `scrollHeight` in a reaction is what a template does.
				}
			);
			try {
				expect(first.style.height).toBe('100px');

				box.value = second;
				await tick();
				expect(second.style.height).toBe('220px');
				// The observer moved with the element.
				expect(MockResizeObserver.instances.at(-1)?.observed[0]).toBe(second);
			} finally {
				await dispose();
			}
		});
	});
});
