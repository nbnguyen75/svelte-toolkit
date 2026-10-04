// @vitest-environment jsdom
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountInitialized } from '../../../../test/fixtures/mount.ts';
import { pointerEvent } from '../../../../test/fixtures/pointer.ts';
import type { PointerInit } from '../../../../test/fixtures/pointer.ts';
import { onLongPress } from './index.ts';

const DELAY = 500;

function button(): HTMLButtonElement {
	const el = document.createElement('button');
	document.body.append(el);
	return el;
}

function down(el: Element, init: PointerInit = {}): void {
	el.dispatchEvent(pointerEvent('pointerdown', init));
}

/** Moves the pointer, which is what abandons a press that turns into a drag. */
function move(el: Element, init: PointerInit): void {
	el.dispatchEvent(pointerEvent('pointermove', init));
}

function release(el: Element, init: PointerInit = {}): void {
	el.dispatchEvent(pointerEvent('pointerup', init));
}

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.runOnlyPendingTimers();
	vi.useRealTimers();
	document.body.replaceChildren();
});

describe('onLongPress', () => {
	it('calls the handler once the press outlasts the delay', async () => {
		const el = button();
		const handler = vi.fn();
		const { dispose } = await mountInitialized(
			() => onLongPress(el, handler),
			() => {}
		);

		down(el);
		expect(handler).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(DELAY);
		expect(handler).toHaveBeenCalledOnce();
		await dispose();
	});

	it('passes the pointerdown event that started the press', async () => {
		const el = button();
		const handler = vi.fn();
		const { dispose } = await mountInitialized(
			() => onLongPress(el, handler),
			() => {}
		);

		down(el, { x: 12, y: 34 });
		await vi.advanceTimersByTimeAsync(DELAY);

		expect(handler.mock.calls[0]?.[0].type).toBe('pointerdown');
		expect(handler.mock.calls[0]?.[0].x).toBe(12);
		await dispose();
	});

	it('does not call the handler before the delay', async () => {
		const el = button();
		const handler = vi.fn();
		const { dispose } = await mountInitialized(
			() => onLongPress(el, handler),
			() => {}
		);

		down(el);
		await vi.advanceTimersByTimeAsync(DELAY - 1);

		expect(handler).not.toHaveBeenCalled();
		await dispose();
	});

	it('honours a custom delay', async () => {
		const el = button();
		const handler = vi.fn();
		const { dispose } = await mountInitialized(
			() => onLongPress(el, handler, { delay: 1000 }),
			() => {}
		);

		down(el);
		await vi.advanceTimersByTimeAsync(999);
		expect(handler).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		expect(handler).toHaveBeenCalledOnce();
		await dispose();
	});

	it('accepts a delay function and reads it per press', async () => {
		const el = button();
		const handler = vi.fn();
		const delay = vi.fn((event: PointerEvent) => (event.pointerId === 1 ? 100 : 900));
		const { dispose } = await mountInitialized(
			() => onLongPress(el, handler, { delay }),
			() => {}
		);

		down(el, { pointerId: 1 });
		await vi.advanceTimersByTimeAsync(100);
		expect(handler).toHaveBeenCalledOnce();

		down(el, { pointerId: 2 });
		await vi.advanceTimersByTimeAsync(899);
		expect(handler).toHaveBeenCalledOnce();

		await vi.advanceTimersByTimeAsync(1);
		expect(handler).toHaveBeenCalledTimes(2);
		expect(delay).toHaveBeenCalledTimes(2);
		await dispose();
	});

	it('abandons the press when the pointer moves past the threshold', async () => {
		const el = button();
		const handler = vi.fn();
		const { dispose } = await mountInitialized(
			() => onLongPress(el, handler),
			() => {}
		);

		down(el, { x: 0, y: 0 });
		move(el, { x: 9, y: 0 });
		await vi.advanceTimersByTimeAsync(DELAY);
		expect(handler).toHaveBeenCalledOnce();

		// 11px is past the 10px default.
		down(el, { x: 0, y: 0 });
		move(el, { x: 11, y: 0 });
		await vi.advanceTimersByTimeAsync(DELAY);
		expect(handler).toHaveBeenCalledOnce();
		await dispose();
	});

	it('measures drift diagonally', async () => {
		const el = button();
		const handler = vi.fn();
		const { dispose } = await mountInitialized(
			() => onLongPress(el, handler),
			() => {}
		);

		// 8-8 is 11.3px away, even though neither axis passed 10.
		down(el, { x: 0, y: 0 });
		move(el, { x: 8, y: 8 });
		await vi.advanceTimersByTimeAsync(DELAY);

		expect(handler).not.toHaveBeenCalled();
		await dispose();
	});

	it('honours a custom threshold', async () => {
		const el = button();
		const handler = vi.fn();
		const { dispose } = await mountInitialized(
			() => onLongPress(el, handler, { distanceThreshold: 40 }),
			() => {}
		);

		down(el, { x: 0, y: 0 });
		move(el, { x: 30, y: 0 });
		await vi.advanceTimersByTimeAsync(DELAY);

		expect(handler).toHaveBeenCalledOnce();
		await dispose();
	});

	it('allows any movement when the threshold is false', async () => {
		const el = button();
		const handler = vi.fn();
		const { dispose } = await mountInitialized(
			() => onLongPress(el, handler, { distanceThreshold: false }),
			() => {}
		);

		down(el, { x: 0, y: 0 });
		move(el, { x: 500, y: 500 });
		await vi.advanceTimersByTimeAsync(DELAY);

		expect(handler).toHaveBeenCalledOnce();
		await dispose();
	});

	it('restarts cleanly after an abandoned press', async () => {
		const el = button();
		const handler = vi.fn();
		const { dispose } = await mountInitialized(
			() => onLongPress(el, handler),
			() => {}
		);

		down(el, { x: 0, y: 0 });
		move(el, { x: 100, y: 0 });
		release(el, { x: 100, y: 0 });

		down(el, { x: 0, y: 0 });
		await vi.advanceTimersByTimeAsync(DELAY);

		expect(handler).toHaveBeenCalledOnce();
		await dispose();
	});

	it('reports the press through onMouseUp', async () => {
		const el = button();
		const onMouseUp = vi.fn();
		const { dispose } = await mountInitialized(
			() => onLongPress(el, () => {}, { onMouseUp }),
			() => {}
		);

		down(el, { x: 100, y: 100 });
		await vi.advanceTimersByTimeAsync(DELAY);
		release(el, { x: 130, y: 140 });

		expect(onMouseUp).toHaveBeenCalledOnce();
		const [duration, distance, isLongPress, event] = onMouseUp.mock.calls[0]!;
		expect(duration).toBeGreaterThanOrEqual(DELAY);
		// 30-40 is exactly 50px.
		expect(distance).toBe(50);
		expect(isLongPress).toBe(true);
		expect(event.type).toBe('pointerup');
		await dispose();
	});

	it('reports a short press as not a long press', async () => {
		const el = button();
		const onMouseUp = vi.fn();
		const { dispose } = await mountInitialized(
			() => onLongPress(el, () => {}, { onMouseUp }),
			() => {}
		);

		down(el, { x: 0, y: 0 });
		await vi.advanceTimersByTimeAsync(50);
		release(el, { x: 0, y: 0 });

		expect(onMouseUp.mock.calls[0]?.[2]).toBe(false);
		await dispose();
	});

	it('reports a release that follows a drag', async () => {
		const el = button();
		const onMouseUp = vi.fn();
		const { dispose } = await mountInitialized(
			() => onLongPress(el, () => {}, { onMouseUp }),
			() => {}
		);

		down(el, { x: 0, y: 0 });
		move(el, { x: 60, y: 0 });
		release(el, { x: 60, y: 0 });

		expect(onMouseUp.mock.calls[0]?.[1]).toBe(60);
		expect(onMouseUp.mock.calls[0]?.[2]).toBe(false);
		await dispose();
	});

	it('treats pointerleave and pointercancel as releases', async () => {
		const el = button();
		const onMouseUp = vi.fn();
		const { dispose } = await mountInitialized(
			() => onLongPress(el, () => {}, { onMouseUp }),
			() => {}
		);

		down(el);
		el.dispatchEvent(pointerEvent('pointerleave'));
		expect(onMouseUp).toHaveBeenCalledOnce();

		down(el);
		el.dispatchEvent(pointerEvent('pointercancel'));
		expect(onMouseUp).toHaveBeenCalledTimes(2);
		await dispose();
	});

	it('ignores a release with no press behind it', async () => {
		const el = button();
		const onMouseUp = vi.fn();
		const { dispose } = await mountInitialized(
			() => onLongPress(el, () => {}, { onMouseUp }),
			() => {}
		);

		release(el);

		expect(onMouseUp).not.toHaveBeenCalled();
		await dispose();
	});

	it('only reports once per press', async () => {
		const el = button();
		const onMouseUp = vi.fn();
		const { dispose } = await mountInitialized(
			() => onLongPress(el, () => {}, { onMouseUp }),
			() => {}
		);

		down(el);
		await vi.advanceTimersByTimeAsync(DELAY);
		release(el);
		el.dispatchEvent(pointerEvent('pointerleave'));

		expect(onMouseUp).toHaveBeenCalledOnce();
		await dispose();
	});

	it('once keeps working after a press that was abandoned', async () => {
		const el = button();
		const handler = vi.fn();
		const { dispose } = await mountInitialized(
			() => onLongPress(el, handler, { modifiers: { once: true } }),
			() => {}
		);

		// A first press that turns into a drag must not spend the option - VueUse
		// passes `once` to addEventListener, which removes all three listeners and
		// leaves the element deaf to every later press.
		down(el, { x: 0, y: 0 });
		move(el, { x: 100, y: 0 });
		release(el, { x: 100, y: 0 });
		await vi.advanceTimersByTimeAsync(DELAY);
		expect(handler).not.toHaveBeenCalled();

		down(el);
		await vi.advanceTimersByTimeAsync(DELAY);
		expect(handler).toHaveBeenCalledOnce();

		down(el);
		await vi.advanceTimersByTimeAsync(DELAY);
		expect(handler).toHaveBeenCalledOnce();
		await dispose();
	});

	it('self ignores presses that start on a descendant', async () => {
		const el = document.createElement('div');
		const child = document.createElement('span');
		el.append(child);
		document.body.append(el);
		const handler = vi.fn();
		const { dispose } = await mountInitialized(
			() => onLongPress(el, handler, { modifiers: { self: true } }),
			() => {}
		);

		down(child);
		await vi.advanceTimersByTimeAsync(DELAY);
		expect(handler).not.toHaveBeenCalled();

		down(el);
		await vi.advanceTimersByTimeAsync(DELAY);
		expect(handler).toHaveBeenCalledOnce();
		await dispose();
	});

	it('prevents the default on the events it handles', async () => {
		const el = button();
		const handler = vi.fn();
		const { dispose } = await mountInitialized(
			() => onLongPress(el, handler, { modifiers: { prevent: true } }),
			() => {}
		);

		const event = pointerEvent('pointerdown');
		el.dispatchEvent(event);
		expect(event.defaultPrevented).toBe(true);

		const moved = pointerEvent('pointermove');
		el.dispatchEvent(moved);
		expect(moved.defaultPrevented).toBe(true);
		await dispose();
	});

	it('stops propagation on the events it handles', async () => {
		const el = button();
		const seen: string[] = [];
		document.body.addEventListener('pointerdown', () => seen.push('body'));
		const handler = vi.fn();
		const { dispose } = await mountInitialized(
			() => onLongPress(el, handler, { modifiers: { stop: true } }),
			() => {}
		);

		down(el);

		expect(seen).toEqual([]);
		await dispose();
	});

	it('follows a target that resolves later', async () => {
		const el = button();
		const source = createBox<HTMLButtonElement | undefined>(undefined);
		const handler = vi.fn();
		const { dispose } = await mountInitialized(
			() => onLongPress(() => source.value, handler),
			() => {}
		);

		down(el);
		await vi.advanceTimersByTimeAsync(DELAY);
		expect(handler).not.toHaveBeenCalled();

		source.value = el;
		await tick();
		down(el);
		await vi.advanceTimersByTimeAsync(DELAY);

		expect(handler).toHaveBeenCalledOnce();
		await dispose();
	});

	it('detaches when the returned function is called', async () => {
		const el = button();
		const handler = vi.fn();
		let stop!: () => void;
		const { dispose } = await mountInitialized(
			() => {
				stop = onLongPress(el, handler);
				return stop;
			},
			() => {}
		);

		stop();
		down(el);
		await vi.advanceTimersByTimeAsync(DELAY);

		expect(handler).not.toHaveBeenCalled();
		await dispose();
	});

	it('cancels a press in flight when stopped', async () => {
		const el = button();
		const handler = vi.fn();
		let stop!: () => void;
		const { dispose } = await mountInitialized(
			() => {
				stop = onLongPress(el, handler);
				return stop;
			},
			() => {}
		);

		down(el);
		stop();
		await vi.advanceTimersByTimeAsync(DELAY);

		expect(handler).not.toHaveBeenCalled();
		await dispose();
	});

	it('cancels a press in flight on unmount', async () => {
		const el = button();
		const handler = vi.fn();
		const { dispose } = await mountInitialized(
			() => onLongPress(el, handler),
			() => {}
		);

		down(el);
		await dispose();
		await vi.advanceTimersByTimeAsync(DELAY);

		expect(handler).not.toHaveBeenCalled();
	});

	it('ignores a nullish target instead of throwing', async () => {
		const handler = vi.fn();
		let stop!: () => void;
		const { dispose } = await mountInitialized(
			() => {
				stop = onLongPress(null, handler);
				return stop;
			},
			() => {}
		);

		await vi.advanceTimersByTimeAsync(DELAY);
		expect(handler).not.toHaveBeenCalled();
		stop();
		await dispose();
	});
});
