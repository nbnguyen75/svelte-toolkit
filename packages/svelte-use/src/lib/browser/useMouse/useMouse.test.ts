// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mountUtil } from '../../../../test/fixtures/mount.ts';
import type { UseMouseOptions } from './index.ts';
import { useMouse } from './index.ts';

type Coordinate =
	| 'clientX'
	| 'clientY'
	| 'screenX'
	| 'screenY'
	| 'pageX'
	| 'pageY'
	| 'movementX'
	| 'movementY';

/**
 * jsdom reports `pageX === clientX` and always `movementX === 0`, so the field
 * under test is defined explicitly instead of relying on the init dict.
 */
function mouse(type: string, coords: Partial<Record<Coordinate, number>> = {}): MouseEvent {
	const event = new MouseEvent(type, {
		bubbles: true,
		clientX: coords.clientX,
		clientY: coords.clientY,
		screenX: coords.screenX,
		screenY: coords.screenY
	});
	for (const [key, value] of Object.entries(coords)) {
		if (value === undefined) continue;
		Object.defineProperty(event, key, { value });
	}
	return event;
}

/** jsdom ships `TouchEvent` but no `Touch` constructor, so a touch is a coordinate bag. */
function touch(
	type: string,
	coords: { clientX: number; clientY: number; pageX?: number; pageY?: number }
): TouchEvent {
	const event = new TouchEvent(type, { bubbles: true });
	Object.defineProperty(event, 'touches', {
		value: [
			{
				identifier: 0,
				target: document.body,
				clientX: coords.clientX,
				clientY: coords.clientY,
				pageX: coords.pageX ?? coords.clientX,
				pageY: coords.pageY ?? coords.clientY,
				screenX: coords.clientX,
				screenY: coords.clientY
			}
		]
	});
	return event;
}

/** jsdom has no layout engine and refuses `scrollTo`, so the offset is faked. */
function stubScroll(x: number, y: number): void {
	Object.defineProperty(window, 'scrollX', { configurable: true, value: x });
	Object.defineProperty(window, 'scrollY', { configurable: true, value: y });
}

/** Mount `useMouse` and hand back the API plus its teardown. */
async function mountMouse(options?: UseMouseOptions): Promise<{
	api: ReturnType<typeof useMouse>;
	dispose: () => Promise<void>;
}> {
	return mountUtil(() => useMouse(options));
}

describe('useMouse', () => {
	const homeX = window.scrollX;
	const homeY = window.scrollY;

	beforeEach(() => stubScroll(0, 0));
	afterEach(() => stubScroll(homeX, homeY));

	describe('coordinate types', () => {
		it('defaults to page coordinates', async () => {
			const { api, dispose } = await mountMouse();
			try {
				window.dispatchEvent(
					mouse('mousemove', { clientX: 10, clientY: 20, pageX: 110, pageY: 220 })
				);
				expect(api.x).toBe(110);
				expect(api.y).toBe(220);
			} finally {
				await dispose();
			}
		});

		it('reports client coordinates', async () => {
			const { api, dispose } = await mountMouse({ type: 'client' });
			try {
				window.dispatchEvent(
					mouse('mousemove', { clientX: 10, clientY: 20, pageX: 110, pageY: 220 })
				);
				expect(api.x).toBe(10);
				expect(api.y).toBe(20);
			} finally {
				await dispose();
			}
		});

		it('reports screen coordinates', async () => {
			const { api, dispose } = await mountMouse({ type: 'screen' });
			try {
				window.dispatchEvent(mouse('mousemove', { screenX: 300, screenY: 400 }));
				expect(api.x).toBe(300);
				expect(api.y).toBe(400);
			} finally {
				await dispose();
			}
		});

		it('reports movement deltas rather than a position', async () => {
			const { api, dispose } = await mountMouse({ type: 'movement' });
			try {
				window.dispatchEvent(
					mouse('mousemove', { clientX: 500, clientY: 500, movementX: 3, movementY: -2 })
				);
				expect(api.x).toBe(3);
				expect(api.y).toBe(-2);

				window.dispatchEvent(mouse('mousemove', { movementX: 4, movementY: 1 }));
				expect(api.x).toBe(4);
				expect(api.y).toBe(1);
			} finally {
				await dispose();
			}
		});

		it('ignores a touch for movement, which has no touch equivalent', async () => {
			const { api, dispose } = await mountMouse({ type: 'movement' });
			try {
				window.dispatchEvent(touch('touchstart', { clientX: 50, clientY: 60 }));
				expect(api.x).toBe(0);
				expect(api.sourceType).toBeNull();
			} finally {
				await dispose();
			}
		});

		it('accepts a custom extractor', async () => {
			const { api, dispose } = await mountMouse({
				type: (event) => [event.clientX * 2, event.clientY * 2]
			});
			try {
				window.dispatchEvent(mouse('mousemove', { clientX: 21, clientY: 5 }));
				expect(api.x).toBe(42);
				expect(api.y).toBe(10);
			} finally {
				await dispose();
			}
		});

		it('ignores an event the extractor declines', async () => {
			const { api, dispose } = await mountMouse({ type: () => null });
			try {
				window.dispatchEvent(mouse('mousemove', { clientX: 10, clientY: 20 }));
				expect(api.x).toBe(0);
				expect(api.sourceType).toBeNull();
			} finally {
				await dispose();
			}
		});
	});

	describe('sourceType', () => {
		it('starts null before any event', async () => {
			const { api, dispose } = await mountMouse();
			try {
				expect(api.sourceType).toBeNull();
			} finally {
				await dispose();
			}
		});

		it('flips between mouse and touch', async () => {
			const { api, dispose } = await mountMouse();
			try {
				window.dispatchEvent(mouse('mousemove', { clientX: 1, clientY: 2 }));
				expect(api.sourceType).toBe('mouse');

				window.dispatchEvent(
					touch('touchmove', { clientX: 30, clientY: 40, pageX: 300, pageY: 400 })
				);
				expect(api.sourceType).toBe('touch');
				expect(api.x).toBe(300);
			} finally {
				await dispose();
			}
		});

		it('tracks a dragover, so the position survives an HTML5 drag', async () => {
			const { api, dispose } = await mountMouse();
			try {
				window.dispatchEvent(mouse('dragover', { clientX: 77, clientY: 88 }));
				expect(api.sourceType).toBe('mouse');
				expect(api.x).toBe(77);
			} finally {
				await dispose();
			}
		});
	});

	describe('touch', () => {
		it('ignores a touchmove that has no active touches', async () => {
			const { api, dispose } = await mountMouse();
			try {
				const empty = new TouchEvent('touchmove', { bubbles: true });
				Object.defineProperty(empty, 'touches', { value: [] });
				window.dispatchEvent(empty);

				expect(api.x).toBe(0);
				expect(api.sourceType).toBeNull();
			} finally {
				await dispose();
			}
		});

		it('skips touch listeners when touch is false', async () => {
			const { api, dispose } = await mountMouse({ touch: false });
			try {
				window.dispatchEvent(touch('touchstart', { clientX: 90, clientY: 90 }));
				expect(api.sourceType).toBeNull();
			} finally {
				await dispose();
			}
		});

		it('keeps the position on touchend by default', async () => {
			const { api, dispose } = await mountMouse();
			try {
				window.dispatchEvent(touch('touchstart', { clientX: 12, clientY: 34 }));
				window.dispatchEvent(new TouchEvent('touchend', { bubbles: true }));
				expect(api.x).toBe(12);
			} finally {
				await dispose();
			}
		});

		it('resets on touchend only when asked', async () => {
			const { api, dispose } = await mountMouse({ resetOnTouchEnds: true });
			try {
				window.dispatchEvent(touch('touchstart', { clientX: 12, clientY: 34 }));
				window.dispatchEvent(new TouchEvent('touchend', { bubbles: true }));
				expect(api.x).toBe(0);
				expect(api.y).toBe(0);
			} finally {
				await dispose();
			}
		});

		it('restores initialValue, not zero', async () => {
			const { api, dispose } = await mountMouse({
				resetOnTouchEnds: true,
				initialValue: { x: 5, y: 6 }
			});
			try {
				expect(api.x).toBe(5);
				window.dispatchEvent(touch('touchstart', { clientX: 12, clientY: 34 }));
				window.dispatchEvent(new TouchEvent('touchend', { bubbles: true }));
				expect(api.x).toBe(5);
				expect(api.y).toBe(6);
			} finally {
				await dispose();
			}
		});
	});

	describe('scroll compensation', () => {
		it('offsets a page position by the viewport scroll', async () => {
			const { api, dispose } = await mountMouse();
			try {
				window.dispatchEvent(mouse('mousemove', { clientX: 10, clientY: 20 }));

				stubScroll(0, 100);
				window.dispatchEvent(new Event('scroll'));

				expect(api.y).toBe(120);
				expect(api.x).toBe(10);
			} finally {
				await dispose();
			}
		});

		it('counts the total document offset without double counting', async () => {
			const { api, dispose } = await mountMouse();
			try {
				window.dispatchEvent(mouse('mousemove', { clientX: 10, clientY: 20 }));

				stubScroll(0, 100);
				window.dispatchEvent(new Event('scroll'));
				expect(api.y).toBe(120);

				// A second scroll event at the same offset must not add again.
				window.dispatchEvent(new Event('scroll'));
				expect(api.y).toBe(120);

				// Scrolling further keeps tracking the document offset, because
				// the delta is measured from the last move, not from the last event.
				stubScroll(0, 300);
				window.dispatchEvent(new Event('scroll'));
				expect(api.y).toBe(320);
			} finally {
				await dispose();
			}
		});

		it('re-anchors to a fresh move', async () => {
			const { api, dispose } = await mountMouse();
			try {
				window.dispatchEvent(mouse('mousemove', { clientY: 20 }));

				stubScroll(0, 150);
				window.dispatchEvent(mouse('mousemove', { clientY: 20 }));
				// jsdom reports pageY === clientY, so the event anchors y at 20.
				expect(api.y).toBe(20);

				window.dispatchEvent(new Event('scroll'));
				// The baseline is now the same 150, so there is nothing to add.
				expect(api.y).toBe(20);
			} finally {
				await dispose();
			}
		});

		it('does nothing before the first move', async () => {
			const { api, dispose } = await mountMouse();
			try {
				stubScroll(500, 500);
				window.dispatchEvent(new Event('scroll'));
				expect(api.x).toBe(0);
				expect(api.y).toBe(0);
			} finally {
				await dispose();
			}
		});

		it('skips the scroll listener for a non-page type', async () => {
			const { api, dispose } = await mountMouse({ type: 'client' });
			try {
				window.dispatchEvent(mouse('mousemove', { clientX: 10, clientY: 20 }));

				stubScroll(0, 100);
				window.dispatchEvent(new Event('scroll'));

				expect(api.y).toBe(20);
			} finally {
				await dispose();
			}
		});

		it('skips the scroll listener when scroll is false', async () => {
			const { api, dispose } = await mountMouse({ scroll: false });
			try {
				window.dispatchEvent(mouse('mousemove', { clientX: 10, clientY: 20 }));

				stubScroll(0, 100);
				window.dispatchEvent(new Event('scroll'));

				expect(api.y).toBe(20);
			} finally {
				await dispose();
			}
		});

		it('does not credit a touch to the mouse scroll baseline', async () => {
			const { api, dispose } = await mountMouse();
			try {
				window.dispatchEvent(touch('touchstart', { clientX: 10, clientY: 20 }));
				stubScroll(0, 100);
				window.dispatchEvent(new Event('scroll'));

				// A touch sets no mouse baseline, so there is nothing to add.
				expect(api.y).toBe(20);
			} finally {
				await dispose();
			}
		});
	});

	describe('target', () => {
		it('listens on a custom target', async () => {
			const el = document.createElement('div');
			document.body.append(el);
			const { api, dispose } = await mountMouse({ target: () => el });
			try {
				el.dispatchEvent(mouse('mousemove', { clientX: 7, clientY: 8 }));
				expect(api.x).toBe(7);

				window.dispatchEvent(mouse('mousemove', { clientX: 99, clientY: 99 }));
				expect(api.x).toBe(7);
			} finally {
				await dispose();
				el.remove();
			}
		});

		it('accepts a bare target', async () => {
			const el = document.createElement('div');
			document.body.append(el);
			const { api, dispose } = await mountMouse({ target: el });
			try {
				el.dispatchEvent(mouse('mousemove', { clientX: 21, clientY: 22 }));
				expect(api.x).toBe(21);
			} finally {
				await dispose();
				el.remove();
			}
		});

		it('attaches nothing for a null target', async () => {
			const { api, dispose } = await mountMouse({ target: () => null });
			try {
				window.dispatchEvent(mouse('mousemove', { clientX: 1, clientY: 1 }));
				expect(api.x).toBe(0);
			} finally {
				await dispose();
			}
		});
	});

	describe('cleanup', () => {
		it('stops listening after unmount', async () => {
			const { api, dispose } = await mountMouse();
			await dispose();

			window.dispatchEvent(mouse('mousemove', { clientX: 40, clientY: 50 }));
			expect(api.x).toBe(0);
		});

		it('does not react to a window scroll after unmount', async () => {
			const { api, dispose } = await mountMouse();
			window.dispatchEvent(mouse('mousemove', { clientX: 10, clientY: 20 }));
			await dispose();

			stubScroll(0, 500);
			window.dispatchEvent(new Event('scroll'));
			expect(api.y).toBe(20);
		});
	});

	describe('reactivity', () => {
		it('exposes exactly x, y, and sourceType', async () => {
			const { api, dispose } = await mountMouse();
			try {
				expect(Object.keys(api).sort()).toEqual(['sourceType', 'x', 'y']);
			} finally {
				await dispose();
			}
		});

		it('reads live state rather than a snapshot', async () => {
			const { api, dispose } = await mountMouse();
			try {
				const first = api.x;
				expect(first).toBe(0);

				window.dispatchEvent(mouse('mousemove', { clientX: 30, clientY: 40 }));
				expect(api.x).toBe(30);
				expect(first).toBe(0);
			} finally {
				await dispose();
			}
		});
	});

	describe('regressions', () => {
		it('reports a mouse event that carries no coordinates as (0, 0)', async () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const { api, dispose } = await mountMouse();
			try {
				window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
				expect(api.x).toBe(0);
				expect(api.sourceType).toBe('mouse');
				expect(warn).not.toHaveBeenCalled();
			} finally {
				await dispose();
			}
		});
	});
});
