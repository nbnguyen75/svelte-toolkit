// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mountUtil } from '../../../../test/fixtures/mount.ts';
import type { UseMousePressedEvent, UseMousePressedOptions } from './index.ts';
import { useMousePressed } from './index.ts';

type PressedApi = ReturnType<typeof useMousePressed>;

async function mountPressed(options?: UseMousePressedOptions): Promise<{
	api: PressedApi;
	dispose: () => Promise<void>;
}> {
	return mountUtil(() => useMousePressed(options));
}

/** A fresh element per test, appended so events bubble to window. */
function element(): HTMLElement {
	const el = document.createElement('button');
	document.body.append(el);
	return el;
}

describe('useMousePressed', () => {
	const created: HTMLElement[] = [];

	function track(): HTMLElement {
		const el = element();
		created.push(el);
		return el;
	}

	afterEach(() => {
		for (const el of created.splice(0)) el.remove();
	});

	describe('mouse', () => {
		it('starts released', async () => {
			const { api, dispose } = await mountPressed();
			try {
				expect(api.pressed).toBe(false);
				expect(api.sourceType).toBeNull();
			} finally {
				await dispose();
			}
		});

		it('honours initialValue', async () => {
			const { api, dispose } = await mountPressed({ initialValue: true });
			try {
				expect(api.pressed).toBe(true);
			} finally {
				await dispose();
			}
		});

		it('presses on mousedown and releases on mouseup', async () => {
			const el = track();
			const { api, dispose } = await mountPressed({ target: () => el });
			try {
				el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
				expect(api.pressed).toBe(true);
				expect(api.sourceType).toBe('mouse');

				window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
				expect(api.pressed).toBe(false);
				expect(api.sourceType).toBeNull();
			} finally {
				await dispose();
			}
		});

		it('releases when the pointer leaves the window', async () => {
			const el = track();
			const { api, dispose } = await mountPressed({ target: () => el });
			try {
				el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
				expect(api.pressed).toBe(true);

				window.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
				expect(api.pressed).toBe(false);
			} finally {
				await dispose();
			}
		});

		it('releases even when the button comes up outside the target', async () => {
			const el = track();
			const other = track();
			const { api, dispose } = await mountPressed({ target: () => el });
			try {
				el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
				// A mouseup on some unrelated element still reaches window.
				other.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
				expect(api.pressed).toBe(false);
			} finally {
				await dispose();
			}
		});

		it('survives a press that never ends', async () => {
			const el = track();
			const { api, dispose } = await mountPressed({ target: () => el });
			try {
				el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
				window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
				window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));

				expect(api.pressed).toBe(true);
			} finally {
				await dispose();
			}
		});

		it('ignores a mouseup with no prior press', async () => {
			const el = track();
			const { api, dispose } = await mountPressed({ target: () => el });
			try {
				window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
				expect(api.pressed).toBe(false);
				expect(api.sourceType).toBeNull();
			} finally {
				await dispose();
			}
		});

		it('accepts a bare target', async () => {
			const el = track();
			const { api, dispose } = await mountPressed({ target: el });
			try {
				el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
				expect(api.pressed).toBe(true);
			} finally {
				await dispose();
			}
		});

		it('defaults to window when no target is given', async () => {
			const { api, dispose } = await mountPressed();
			try {
				window.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
				expect(api.pressed).toBe(true);

				window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
				expect(api.pressed).toBe(false);
			} finally {
				await dispose();
			}
		});
	});

	describe('touch', () => {
		it('presses on touchstart and releases on touchend', async () => {
			const el = track();
			const { api, dispose } = await mountPressed({ target: () => el });
			try {
				el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }));
				expect(api.pressed).toBe(true);
				expect(api.sourceType).toBe('touch');

				window.dispatchEvent(new TouchEvent('touchend', { bubbles: true }));
				expect(api.pressed).toBe(false);
				expect(api.sourceType).toBeNull();
			} finally {
				await dispose();
			}
		});

		it('releases on a cancelled touch', async () => {
			const el = track();
			const { api, dispose } = await mountPressed({ target: () => el });
			try {
				el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }));
				window.dispatchEvent(new TouchEvent('touchcancel', { bubbles: true }));
				expect(api.pressed).toBe(false);
			} finally {
				await dispose();
			}
		});

		it('attaches nothing for touch when touch is false', async () => {
			const el = track();
			const { api, dispose } = await mountPressed({ target: () => el, touch: false });
			try {
				el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }));
				expect(api.pressed).toBe(false);
				expect(api.sourceType).toBeNull();
			} finally {
				await dispose();
			}
		});
	});

	describe('drag', () => {
		// A real `DragEvent` extends `MouseEvent`, and jsdom has no `DragEvent`
		// constructor, so a `MouseEvent` is the closest faithful stand-in.
		const dragstart = () => new MouseEvent('dragstart', { bubbles: true });

		it('presses on dragstart and releases on drop', async () => {
			const el = track();
			const { api, dispose } = await mountPressed({ target: () => el });
			try {
				el.dispatchEvent(dragstart());
				expect(api.pressed).toBe(true);
				// A drag reports as a mouse, matching VueUse.
				expect(api.sourceType).toBe('mouse');

				window.dispatchEvent(new MouseEvent('drop', { bubbles: true }));
				expect(api.pressed).toBe(false);
			} finally {
				await dispose();
			}
		});

		it('releases on dragend, for a drag abandoned outside a drop target', async () => {
			const el = track();
			const { api, dispose } = await mountPressed({ target: () => el });
			try {
				el.dispatchEvent(dragstart());
				window.dispatchEvent(new MouseEvent('dragend', { bubbles: true }));
				expect(api.pressed).toBe(false);
			} finally {
				await dispose();
			}
		});

		it('attaches nothing for drag when drag is false', async () => {
			const el = track();
			const { api, dispose } = await mountPressed({ target: () => el, drag: false });
			try {
				el.dispatchEvent(dragstart());
				expect(api.pressed).toBe(false);
			} finally {
				await dispose();
			}
		});
	});

	describe('callbacks', () => {
		it('calls onPressed with the event', async () => {
			const el = track();
			const onPressed = vi.fn();
			const { dispose } = await mountPressed({ target: () => el, onPressed });
			try {
				const event = new MouseEvent('mousedown', { bubbles: true });
				el.dispatchEvent(event);
				expect(onPressed).toHaveBeenCalledTimes(1);
				expect(onPressed).toHaveBeenCalledWith(event);
			} finally {
				await dispose();
			}
		});

		it('calls onReleased with the event', async () => {
			const el = track();
			const onReleased = vi.fn();
			const { dispose } = await mountPressed({ target: () => el, onReleased });
			try {
				el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
				const event = new MouseEvent('mouseup', { bubbles: true });
				window.dispatchEvent(event);
				expect(onReleased).toHaveBeenCalledWith(event);
			} finally {
				await dispose();
			}
		});

		it('fires onPressed before pressed flips', async () => {
			const el = track();
			let duringCallback = true;
			const { api, dispose } = await mountPressed({
				target: () => el,
				onPressed: () => {
					duringCallback = api.pressed;
				}
			});
			try {
				el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
				expect(duringCallback).toBe(false);
				expect(api.pressed).toBe(true);
			} finally {
				await dispose();
			}
		});

		it('fires onReleased before pressed clears', async () => {
			const el = track();
			let duringCallback: boolean | null = null;
			const { dispose } = await mountPressed({
				target: () => el,
				onReleased: () => {
					duringCallback = true;
				}
			});
			try {
				el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
				window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
				expect(duringCallback).toBe(true);
			} finally {
				await dispose();
			}
		});

		it('forwards a TouchEvent as-is', async () => {
			const el = track();
			const onPressed = vi.fn();
			const { dispose } = await mountPressed({ target: () => el, onPressed });
			try {
				const event = new TouchEvent('touchstart', { bubbles: true });
				el.dispatchEvent(event);
				const [forwarded] = onPressed.mock.calls[0] as [UseMousePressedEvent];
				expect(forwarded).toBe(event);
				expect(forwarded.touches).toBeDefined();
			} finally {
				await dispose();
			}
		});

		it('constructs without either callback', async () => {
			const el = track();
			const { api, dispose } = await mountPressed({ target: () => el });
			try {
				expect(() =>
					el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
				).not.toThrow();
				expect(api.pressed).toBe(true);
			} finally {
				await dispose();
			}
		});
	});

	describe('capture', () => {
		it('captures the press before it reaches a descendant handler', async () => {
			const el = track();
			const child = document.createElement('span');
			el.append(child);
			const order: string[] = [];
			child.addEventListener('mousedown', () => order.push('bubble'));
			const { api, dispose } = await mountPressed({
				target: () => el,
				capture: true,
				onPressed: () => order.push('capture')
			});
			try {
				child.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, bubbles: true }));
				expect(order).toEqual(['capture', 'bubble']);
				expect(api.pressed).toBe(true);
			} finally {
				await dispose();
			}
		});
	});

	describe('cleanup', () => {
		it('stops listening after unmount', async () => {
			const el = track();
			const { api, dispose } = await mountPressed({ target: () => el });
			await dispose();

			el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
			expect(api.pressed).toBe(false);
		});

		it('does not release after unmount', async () => {
			const el = track();
			const { api, dispose } = await mountPressed({ target: () => el });
			el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
			await dispose();

			window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
			expect(api.pressed).toBe(true);
		});
	});

	describe('surface', () => {
		it('exposes exactly pressed and sourceType', async () => {
			const { api, dispose } = await mountPressed();
			try {
				expect(Object.keys(api).sort()).toEqual(['pressed', 'sourceType']);
			} finally {
				await dispose();
			}
		});
	});
});
