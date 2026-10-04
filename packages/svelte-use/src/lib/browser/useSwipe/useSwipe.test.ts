// @vitest-environment jsdom
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountUtil } from '../../../../test/fixtures/mount.ts';
import { touchEvent } from '../../../../test/fixtures/pointer.ts';
import type { TouchCoords } from '../../../../test/fixtures/pointer.ts';
import type { UseSwipeOptions } from './index.ts';
import { useSwipe } from './index.ts';

const mounted: (() => Promise<void>)[] = [];

afterEach(async () => {
	for (const dispose of mounted.splice(0)) await dispose();
	// `mountUtil` removes only its own host, so the swipe targets pile up.
	document.body.replaceChildren();
});

function box(): HTMLElement {
	const el = document.createElement('div');
	document.body.append(el);
	return el;
}

async function setup(options?: UseSwipeOptions, target: HTMLElement = box()) {
	const { api, dispose } = await mountUtil(() => useSwipe(() => target, options));
	mounted.push(dispose);
	return api;
}

function start(el: HTMLElement, at: TouchCoords = { clientX: 0, clientY: 0 }): void {
	el.dispatchEvent(touchEvent('touchstart', [at]));
}

function move(el: HTMLElement, to: TouchCoords): void {
	el.dispatchEvent(touchEvent('touchmove', [to]));
}

function end(el: HTMLElement): void {
	el.dispatchEvent(touchEvent('touchend', []));
}

/** A touch, a move to `to`, and the lift: one whole swipe. */
function swipe(el: HTMLElement, to: TouchCoords, options?: UseSwipeOptions): void {
	start(el, { clientX: 100, clientY: 100 });
	move(el, to);
	end(el);
}

describe('useSwipe', () => {
	it('starts with no direction and no travel', async () => {
		const swipeState = await setup();

		expect(swipeState.direction).toBe('none');
		expect(swipeState.isSwiping).toBe(false);
		expect(swipeState.lengthX).toBe(0);
		expect(swipeState.lengthY).toBe(0);
		expect(swipeState.coordsStart).toEqual({ x: 0, y: 0 });
		expect(swipeState.coordsEnd).toEqual({ x: 0, y: 0 });
	});

	describe('direction', () => {
		it('reads right when the finger travelled right', async () => {
			const el = box();
			const swipeState = await setup(undefined, el);

			swipe(el, { clientX: 200, clientY: 100 });

			// start 100 minus end 200, so the length is negative.
			expect(swipeState.direction).toBe('right');
			expect(swipeState.lengthX).toBe(-100);
		});

		it('reads left when the finger travelled left', async () => {
			const el = box();
			const swipeState = await setup(undefined, el);

			swipe(el, { clientX: 0, clientY: 100 });

			expect(swipeState.direction).toBe('left');
			expect(swipeState.lengthX).toBe(100);
		});

		it('reads down when the finger travelled down', async () => {
			const el = box();
			const swipeState = await setup(undefined, el);

			swipe(el, { clientX: 100, clientY: 200 });

			expect(swipeState.direction).toBe('down');
			expect(swipeState.lengthY).toBe(-100);
		});

		it('reads up when the finger travelled up', async () => {
			const el = box();
			const swipeState = await setup(undefined, el);

			swipe(el, { clientX: 100, clientY: 0 });

			expect(swipeState.direction).toBe('up');
			expect(swipeState.lengthY).toBe(100);
		});

		it('picks the axis the finger actually travelled along', async () => {
			const el = box();
			const swipeState = await setup(undefined, el);

			// 60 across, 30 down: horizontal wins.
			swipe(el, { clientX: 160, clientY: 130 });

			expect(swipeState.direction).toBe('right');
		});

		it('picks the vertical axis on a tie, matching VueUse', async () => {
			const el = box();
			const swipeState = await setup(undefined, el);

			// Exactly 50/50: `abs(diffX) > abs(diffY)` is false, so the else wins.
			swipe(el, { clientX: 150, clientY: 150 });

			expect(swipeState.direction).toBe('down');
		});

		it('stays none below the threshold', async () => {
			const el = box();
			const swipeState = await setup(undefined, el);

			start(el, { clientX: 100, clientY: 100 });
			move(el, { clientX: 120, clientY: 100 });

			// Travelled 20, threshold is 50. The length is still reported.
			expect(swipeState.direction).toBe('none');
			expect(swipeState.lengthX).toBe(-20);
		});

		it('swipes at exactly the threshold', async () => {
			const el = box();
			const swipeState = await setup(undefined, el);

			start(el, { clientX: 100, clientY: 100 });
			move(el, { clientX: 150, clientY: 100 });

			// `>=`, not `>`: exactly the threshold counts.
			expect(swipeState.direction).toBe('right');
		});

		it('honours a custom threshold', async () => {
			const el = box();
			const swipeState = await setup({ threshold: 10 }, el);

			swipe(el, { clientX: 115, clientY: 100 });

			expect(swipeState.direction).toBe('right');
		});

		it('re-reads a threshold getter per event', async () => {
			const el = box();
			let threshold = 200;
			const swipeState = await setup({ threshold: () => threshold }, el);

			start(el, { clientX: 100, clientY: 100 });
			move(el, { clientX: 150, clientY: 100 });
			expect(swipeState.direction).toBe('none');

			threshold = 10;
			move(el, { clientX: 151, clientY: 100 });
			expect(swipeState.direction).toBe('right');
		});

		it('keeps the last direction after the finger lifts', async () => {
			const el = box();
			const swipeState = await setup(undefined, el);

			swipe(el, { clientX: 0, clientY: 100 });

			// VueUse does not reset the coordinates on touchend, so the direction
			// survives the lift and only isSwiping clears.
			expect(swipeState.isSwiping).toBe(false);
			expect(swipeState.direction).toBe('left');
		});
	});

	describe('isSwiping', () => {
		it('is false until the threshold is met, then true', async () => {
			const el = box();
			const swipeState = await setup(undefined, el);

			start(el, { clientX: 100, clientY: 100 });
			expect(swipeState.isSwiping).toBe(false);

			move(el, { clientX: 110, clientY: 100 });
			expect(swipeState.isSwiping).toBe(false);

			move(el, { clientX: 200, clientY: 100 });
			expect(swipeState.isSwiping).toBe(true);
		});

		it('clears on touchend', async () => {
			const el = box();
			const swipeState = await setup(undefined, el);

			start(el, { clientX: 100, clientY: 100 });
			move(el, { clientX: 200, clientY: 100 });
			end(el);

			expect(swipeState.isSwiping).toBe(false);
		});

		it('clears on touchcancel', async () => {
			const el = box();
			const swipeState = await setup(undefined, el);

			start(el, { clientX: 100, clientY: 100 });
			move(el, { clientX: 200, clientY: 100 });
			el.dispatchEvent(touchEvent('touchcancel', []));

			expect(swipeState.isSwiping).toBe(false);
		});

		it('can start again after a lift', async () => {
			const el = box();
			const swipeState = await setup(undefined, el);

			swipe(el, { clientX: 200, clientY: 100 });
			expect(swipeState.isSwiping).toBe(false);

			start(el, { clientX: 0, clientY: 0 });
			move(el, { clientX: 0, clientY: -80 });
			expect(swipeState.isSwiping).toBe(true);
			expect(swipeState.direction).toBe('up');
		});
	});

	describe('coords', () => {
		it('records where the touch started and where it last was', async () => {
			const el = box();
			const swipeState = await setup(undefined, el);

			start(el, { clientX: 100, clientY: 120 });
			move(el, { clientX: 60, clientY: 90 });

			expect(swipeState.coordsStart).toEqual({ x: 100, y: 120 });
			expect(swipeState.coordsEnd).toEqual({ x: 60, y: 90 });
		});

		it('resets the end point on every touchstart', async () => {
			const el = box();
			const swipeState = await setup(undefined, el);

			swipe(el, { clientX: 0, clientY: 0 });
			start(el, { clientX: 500, clientY: 500 });

			// A new touch zeroes the travel, so nothing is left over from the last.
			expect(swipeState.coordsStart).toEqual({ x: 500, y: 500 });
			expect(swipeState.coordsEnd).toEqual({ x: 500, y: 500 });
			expect(swipeState.lengthX).toBe(0);
			expect(swipeState.direction).toBe('none');
		});
	});

	describe('multi-touch', () => {
		it('ignores a touchstart with two fingers', async () => {
			const el = box();
			const swipeState = await setup(undefined, el);

			el.dispatchEvent(
				touchEvent('touchstart', [
					{ clientX: 10, clientY: 10 },
					{ clientX: 90, clientY: 90 }
				])
			);

			// A pinch is not a swipe, so nothing moved.
			expect(swipeState.coordsStart).toEqual({ x: 0, y: 0 });
		});

		it('ignores a move with two fingers', async () => {
			const el = box();
			const swipeState = await setup(undefined, el);

			start(el, { clientX: 100, clientY: 100 });
			el.dispatchEvent(
				touchEvent('touchmove', [
					{ clientX: 100, clientY: 100 },
					{ clientX: 400, clientY: 400 }
				])
			);

			expect(swipeState.lengthX).toBe(0);
			expect(swipeState.isSwiping).toBe(false);
		});

		it('does not call onSwipeStart for a pinch', async () => {
			const el = box();
			const onSwipeStart = vi.fn();
			await setup({ onSwipeStart }, el);

			el.dispatchEvent(
				touchEvent('touchstart', [
					{ clientX: 10, clientY: 10 },
					{ clientX: 90, clientY: 90 }
				])
			);

			expect(onSwipeStart).not.toHaveBeenCalled();
		});
	});

	describe('callbacks', () => {
		it('calls onSwipeStart on the touch that starts a swipe', async () => {
			const el = box();
			const onSwipeStart = vi.fn();
			await setup({ onSwipeStart }, el);

			start(el, { clientX: 10, clientY: 20 });

			// Before the threshold: the touch is the start of a swipe, not a swipe.
			expect(onSwipeStart).toHaveBeenCalledTimes(1);
		});

		it('calls onSwipe for each move past the threshold', async () => {
			const el = box();
			const onSwipe = vi.fn();
			await setup({ onSwipe }, el);

			start(el, { clientX: 100, clientY: 100 });
			move(el, { clientX: 110, clientY: 100 });
			expect(onSwipe).not.toHaveBeenCalled();

			move(el, { clientX: 160, clientY: 100 });
			move(el, { clientX: 210, clientY: 100 });
			expect(onSwipe).toHaveBeenCalledTimes(2);
		});

		it('calls onSwipeEnd with the direction', async () => {
			const el = box();
			const onSwipeEnd = vi.fn();
			await setup({ onSwipeEnd }, el);

			swipe(el, { clientX: 0, clientY: 100 });

			expect(onSwipeEnd).toHaveBeenCalledTimes(1);
			expect(onSwipeEnd.mock.calls[0]?.[1]).toBe('left');
		});

		it('does not call onSwipeEnd below the threshold', async () => {
			const el = box();
			const onSwipeEnd = vi.fn();
			await setup({ onSwipeEnd }, el);

			start(el, { clientX: 100, clientY: 100 });
			move(el, { clientX: 110, clientY: 100 });
			end(el);

			expect(onSwipeEnd).not.toHaveBeenCalled();
		});

		it('passes the TouchEvent through, not the plain Event', async () => {
			const el = box();
			const onSwipeStart = vi.fn();
			await setup({ onSwipeStart }, el);

			start(el, { clientX: 10, clientY: 20 });

			expect(onSwipeStart.mock.calls[0]?.[0]).toHaveProperty('touches');
		});
	});

	describe('preventDefault', () => {
		it('does not preventDefault a horizontal move when passive', async () => {
			const el = box();
			await setup(undefined, el);

			start(el, { clientX: 100, clientY: 100 });
			const moved = touchEvent('touchmove', [{ clientX: 200, clientY: 100 }]);
			el.dispatchEvent(moved);

			expect(moved.defaultPrevented).toBe(false);
		});

		it('preventsDefault a horizontal move when not passive', async () => {
			const el = box();
			await setup({ passive: false }, el);

			start(el, { clientX: 100, clientY: 100 });
			const moved = touchEvent('touchmove', [{ clientX: 200, clientY: 100 }]);
			el.dispatchEvent(moved);

			expect(moved.defaultPrevented).toBe(true);
		});

		it('leaves a vertical move alone even when not passive', async () => {
			const el = box();
			await setup({ passive: false }, el);

			start(el, { clientX: 100, clientY: 100 });
			const moved = touchEvent('touchmove', [{ clientX: 110, clientY: 200 }]);
			el.dispatchEvent(moved);

			// Stopping this would make the page impossible to scroll past a
			// carousel, so only the horizontal axis is ever prevented.
			expect(moved.defaultPrevented).toBe(false);
		});
	});

	describe('target', () => {
		it('listens on a named element, not the window', async () => {
			const el = box();
			const swipeState = await setup(undefined, el);

			window.dispatchEvent(touchEvent('touchmove', [{ clientX: 400, clientY: 400 }]));

			expect(swipeState.lengthX).toBe(0);
		});

		it('follows a getter that changes target', async () => {
			const first = box();
			const second = box();
			const target = createBox<HTMLElement>(first);
			const { api, dispose } = await mountUtil(() => useSwipe(() => target.value));
			mounted.push(dispose);

			start(first, { clientX: 100, clientY: 100 });
			move(first, { clientX: 200, clientY: 100 });
			expect(api.direction).toBe('right');

			target.value = second;
			await tick();
			move(first, { clientX: 100, clientY: 100 });
			move(second, { clientX: 100, clientY: 0 });
			expect(api.direction).toBe('up');
		});

		it('binds nothing to a nullish target', async () => {
			const swipeState = await setup(undefined, null as unknown as HTMLElement);

			expect(swipeState.direction).toBe('none');
		});
	});

	describe('stop', () => {
		it('stops listening', async () => {
			const el = box();
			const swipeState = await setup(undefined, el);

			swipe(el, { clientX: 0, clientY: 100 });
			expect(swipeState.direction).toBe('left');

			swipeState.stop();
			start(el, { clientX: 0, clientY: 0 });
			move(el, { clientX: 0, clientY: -400 });

			// Nothing was recorded, so the last state stands.
			expect(swipeState.direction).toBe('left');
		});

		it('is safe to call twice', async () => {
			const swipeState = await setup();

			swipeState.stop();
			expect(() => swipeState.stop()).not.toThrow();
		});

		it('does not detach twice on unmount', async () => {
			const { api, dispose } = await mountUtil(() => useSwipe(() => box()));

			api.stop();
			await expect(dispose()).resolves.toBeUndefined();
		});
	});

	it('removes its listeners on unmount', async () => {
		const el = box();
		const { api, dispose } = await mountUtil(() => useSwipe(() => el));

		swipe(el, { clientX: 0, clientY: 100 });
		expect(api.direction).toBe('left');

		await dispose();
		start(el, { clientX: 0, clientY: 0 });
		move(el, { clientX: 0, clientY: -400 });

		expect(api.direction).toBe('left');
	});
});
