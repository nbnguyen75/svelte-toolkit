// @vitest-environment jsdom
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountUtil } from '../../../../test/fixtures/mount.ts';
import { pointerEvent } from '../../../../test/fixtures/pointer.ts';
import type { PointerInit } from '../../../../test/fixtures/pointer.ts';
import { stubRect, stubScroll } from '../../../../test/fixtures/rect.ts';
import { useDraggable } from './index.ts';

/** A positioned element, laid out where the test says it is. */
function box(rect: Parameters<typeof stubRect>[1] = {}): HTMLElement {
	const el = document.createElement('div');
	document.body.append(el);
	stubRect(el, rect);
	return el;
}

/** A container big enough that nothing clamps unless a test wants it to. */
function roomyContainer(rect: Parameters<typeof stubRect>[1] = {}): HTMLElement {
	const el = box(rect);
	stubScroll(el, { clientWidth: 1000, clientHeight: 1000, scrollWidth: 1000, scrollHeight: 1000 });
	return el;
}

/**
 * The press lands on `el`; the rest goes to `window`, which is where a drag is
 * heard by default - and where a real pointer report ends up once it leaves the
 * element.
 */
function press(el: Element, init: PointerInit = {}): void {
	el.dispatchEvent(pointerEvent('pointerdown', init));
}

function movePointer(init: PointerInit): void {
	window.dispatchEvent(pointerEvent('pointermove', init));
}

function release(init: PointerInit = {}): void {
	window.dispatchEvent(pointerEvent('pointerup', init));
}

/** The press, a move to `to`, and the release: one whole drag. */
function dragBy(el: Element, from: PointerInit, to: PointerInit): void {
	press(el, from);
	movePointer(to);
	release(to);
}

const mounted: Array<() => Promise<void>> = [];

async function setup<T>(create: () => T): Promise<T> {
	const { api, dispose } = await mountUtil(create);
	mounted.push(dispose);
	return api;
}

afterEach(async () => {
	for (const dispose of mounted.splice(0)) await dispose();
	document.body.replaceChildren();
});

describe('useDraggable', () => {
	it('starts at the origin', async () => {
		const drag = await setup(() => useDraggable(box()));

		expect(drag.x).toBe(0);
		expect(drag.y).toBe(0);
		expect(drag.position).toEqual({ x: 0, y: 0 });
		expect(drag.isDragging).toBe(false);
		expect(drag.style).toBe('left: 0px; top: 0px;');
	});

	it('starts where initialValue says', async () => {
		const drag = await setup(() => useDraggable(box(), { initialValue: { x: 10, y: 20 } }));

		expect(drag.position).toEqual({ x: 10, y: 20 });
		expect(drag.style).toBe('left: 10px; top: 20px;');
	});

	it('offsets from the press rather than jumping to the pointer', async () => {
		// The element sits at 50/50, so the press at 80/80 is 30/30 into it.
		const el = box({ left: 50, top: 50, width: 100, height: 100 });
		const drag = await setup(() => useDraggable(el));

		dragBy(el, { x: 80, y: 80 }, { x: 130, y: 140 });

		expect(drag.position).toEqual({ x: 100, y: 110 });
		expect(drag.isDragging).toBe(false);
	});

	it('reports isDragging only between the press and the release', async () => {
		const el = box();
		const drag = await setup(() => useDraggable(el));

		press(el);
		expect(drag.isDragging).toBe(true);

		release();
		expect(drag.isDragging).toBe(false);
	});

	it('ignores moves with no press behind them', async () => {
		const drag = await setup(() => useDraggable(box()));

		movePointer({ x: 100, y: 100 });

		expect(drag.position).toEqual({ x: 0, y: 0 });
	});

	it('ends the drag on pointercancel', async () => {
		const el = box();
		const drag = await setup(() => useDraggable(el));

		press(el);
		window.dispatchEvent(pointerEvent('pointercancel'));

		expect(drag.isDragging).toBe(false);
	});

	it('calls onStart, onMove, and onEnd with the position', async () => {
		const el = box({ left: 100, top: 100 });
		const onStart = vi.fn();
		const onMove = vi.fn();
		const onEnd = vi.fn();
		await setup(() => useDraggable(el, { onStart, onMove, onEnd }));

		// 150/130 is 50/30 into the element.
		press(el, { x: 150, y: 130 });
		expect(onStart).toHaveBeenCalledWith({ x: 50, y: 30 }, expect.anything());

		movePointer({ x: 170, y: 160 });
		expect(onMove).toHaveBeenCalledWith({ x: 120, y: 130 }, expect.anything());

		release({ x: 170, y: 160 });
		expect(onEnd).toHaveBeenCalledWith({ x: 120, y: 130 }, expect.anything());
	});

	it('lets onStart refuse the drag', async () => {
		const el = box();
		const onMove = vi.fn();
		const drag = await setup(() => useDraggable(el, { onStart: () => false, onMove }));

		press(el);
		movePointer({ x: 100, y: 100 });

		expect(drag.isDragging).toBe(false);
		expect(drag.position).toEqual({ x: 0, y: 0 });
		expect(onMove).not.toHaveBeenCalled();
	});

	it('drags on the x axis only', async () => {
		const el = box();
		const drag = await setup(() => useDraggable(el, { axis: 'x' }));

		dragBy(el, { x: 10, y: 10 }, { x: 60, y: 300 });

		expect(drag.position).toEqual({ x: 50, y: 0 });
	});

	it('drags on the y axis only', async () => {
		const el = box();
		const drag = await setup(() => useDraggable(el, { axis: 'y' }));

		dragBy(el, { x: 10, y: 10 }, { x: 300, y: 60 });

		expect(drag.position).toEqual({ x: 0, y: 50 });
	});

	it('accepts a second drag after the first', async () => {
		const el = box();
		const drag = await setup(() => useDraggable(el));

		dragBy(el, { x: 0, y: 0 }, { x: 10, y: 0 });
		dragBy(el, { x: 0, y: 0 }, { x: 40, y: 0 });

		expect(drag.position).toEqual({ x: 40, y: 0 });
	});

	it('starts a drag from a handle, not from the whole element', async () => {
		const el = box();
		const handle = box();
		const drag = await setup(() => useDraggable(el, { handle: () => handle }));

		press(el);
		movePointer({ x: 100, y: 0 });
		expect(drag.position).toEqual({ x: 0, y: 0 });

		press(handle);
		movePointer({ x: 100, y: 0 });
		expect(drag.position).toEqual({ x: 100, y: 0 });
	});

	it('starts only from the target itself when exact is set', async () => {
		const el = box();
		const child = document.createElement('span');
		el.append(child);
		const drag = await setup(() => useDraggable(el, { exact: true }));

		child.dispatchEvent(pointerEvent('pointerdown', { x: 10, y: 10 }));
		movePointer({ x: 100, y: 0 });
		expect(drag.isDragging).toBe(false);

		press(el, { x: 0, y: 0 });
		movePointer({ x: 100, y: 0 });
		expect(drag.position).toEqual({ x: 100, y: 0 });
	});

	it('ignores a press with a button that is not allowed', async () => {
		const el = box();
		const drag = await setup(() => useDraggable(el));

		press(el, { button: 2 });
		movePointer({ x: 100, y: 0 });

		expect(drag.isDragging).toBe(false);
	});

	it('accepts an allowed secondary button', async () => {
		const el = box();
		const drag = await setup(() => useDraggable(el, { buttons: [2] }));

		press(el, { button: 2 });
		movePointer({ x: 100, y: 0 });

		expect(drag.position).toEqual({ x: 100, y: 0 });
	});

	it('only drags for the pointer types it is told to', async () => {
		const el = box();
		const drag = await setup(() => useDraggable(el, { pointerTypes: ['touch'] }));

		press(el, { pointerType: 'mouse' });
		movePointer({ x: 100, y: 0, pointerType: 'mouse' });
		expect(drag.isDragging).toBe(false);

		press(el, { pointerType: 'touch' });
		movePointer({ x: 100, y: 0, pointerType: 'touch' });
		expect(drag.position).toEqual({ x: 100, y: 0 });
	});

	it('refuses every press while disabled', async () => {
		const el = box();
		const disabled = createBox(true);
		const drag = await setup(() => useDraggable(el, { disabled: () => disabled.value }));

		press(el);
		movePointer({ x: 100, y: 0 });
		expect(drag.isDragging).toBe(false);

		// Read per press, so turning it off starts working immediately.
		disabled.value = false;
		press(el);
		movePointer({ x: 100, y: 0 });
		expect(drag.position).toEqual({ x: 100, y: 0 });
	});

	it('leaves the default alone', async () => {
		const el = box();
		await setup(() => useDraggable(el));

		const event = pointerEvent('pointerdown');
		el.dispatchEvent(event);

		expect(event.defaultPrevented).toBe(false);
	});

	it('prevents the default when asked', async () => {
		const el = box();
		await setup(() => useDraggable(el, { preventDefault: true }));

		const event = pointerEvent('pointerdown');
		el.dispatchEvent(event);

		expect(event.defaultPrevented).toBe(true);
	});

	it('stops propagation when asked', async () => {
		const el = box();
		const seen: string[] = [];
		document.body.addEventListener('pointerdown', () => seen.push('body'));
		await setup(() => useDraggable(el, { stopPropagation: true }));

		press(el);

		expect(seen).toEqual([]);
	});

	// The press is dispatched on a child, so capture is the only thing that can
	// put the listener on the parent ahead of the child that kills propagation.
	it('hears a press through a stopped event by default', async () => {
		const el = box();
		const child = document.createElement('span');
		el.append(child);
		const onStart = vi.fn();
		await setup(() => useDraggable(el, { onStart }));

		child.addEventListener('pointerdown', (event) => event.stopPropagation());
		child.dispatchEvent(pointerEvent('pointerdown'));

		expect(onStart).toHaveBeenCalledOnce();
	});

	it('misses such a press when capture is off', async () => {
		const el = box();
		const child = document.createElement('span');
		el.append(child);
		const onStart = vi.fn();
		await setup(() => useDraggable(el, { onStart, capture: false }));

		child.addEventListener('pointerdown', (event) => event.stopPropagation());
		child.dispatchEvent(pointerEvent('pointerdown'));

		expect(onStart).not.toHaveBeenCalled();
	});

	it('follows a target that resolves later', async () => {
		const source = createBox<HTMLElement | undefined>(undefined);
		const drag = await setup(() => useDraggable(() => source.value));

		press(document.body, { x: 10, y: 0 });
		movePointer({ x: 100, y: 0 });
		expect(drag.isDragging).toBe(false);

		const el = box();
		source.value = el;
		await tick();

		press(el, { x: 0, y: 0 });
		movePointer({ x: 40, y: 0 });

		expect(drag.position).toEqual({ x: 40, y: 0 });
	});

	it('detaches on unmount', async () => {
		const el = box();
		const drag = await mountUtil(() => useDraggable(el));

		await drag.dispose();
		press(el);
		movePointer({ x: 100, y: 0 });

		expect(drag.api.position).toEqual({ x: 0, y: 0 });
	});

	it('ignores a nullish target instead of throwing', async () => {
		const drag = await setup(() => useDraggable(null));

		press(document.body);
		movePointer({ x: 100, y: 0 });

		expect(drag.position).toEqual({ x: 0, y: 0 });
	});

	describe('containerElement', () => {
		it('measures the press against the container, not the viewport', async () => {
			const container = roomyContainer({ left: 100, top: 100 });
			const el = box({ left: 150, top: 130 });
			const drag = await setup(() => useDraggable(el, { containerElement: () => container }));

			// The element is 50/30 into the container, so the press at 130/130 is
			// 80/100 from the container's origin - where it is reported from.
			press(el, { x: 130, y: 130 });
			movePointer({ x: 180, y: 130 });

			expect(drag.position).toEqual({ x: 100, y: 30 });
		});

		it('follows the container as it scrolls', async () => {
			const container = roomyContainer();
			const el = box();
			const drag = await setup(() => useDraggable(el, { containerElement: () => container }));
			container.scrollLeft = 25;
			container.scrollTop = 25;

			// Without the scroll the press at 5/5 would be 5/5 into the element;
			// scrolled by 25, it is -20/-20, so the move lands 25 further on.
			press(el, { x: 5, y: 5 });
			movePointer({ x: 55, y: 55 });

			expect(drag.position).toEqual({ x: 75, y: 75 });
		});

		it('clamps to the container scroll area', async () => {
			const container = box();
			stubScroll(container, {
				clientWidth: 200,
				clientHeight: 200,
				scrollWidth: 400,
				scrollHeight: 400
			});
			const el = box({ width: 50, height: 50 });
			const drag = await setup(() => useDraggable(el, { containerElement: () => container }));

			press(el);
			movePointer({ x: 5000, y: 5000 });

			expect(drag.position).toEqual({ x: 350, y: 350 });
		});

		it('clamps to the visible area when restrictInView is set', async () => {
			const container = box();
			stubScroll(container, {
				clientWidth: 200,
				clientHeight: 200,
				scrollWidth: 400,
				scrollHeight: 400,
				scrollLeft: 100,
				scrollTop: 100
			});
			const el = box({ width: 50, height: 50 });
			const drag = await setup(() =>
				useDraggable(el, { containerElement: () => container, restrictInView: true })
			);

			press(el);
			movePointer({ x: 5000, y: 5000 });

			// The visible box ends at 200 - 50, which is 250 from the scroll origin.
			expect(drag.position).toEqual({ x: 250, y: 250 });
		});

		it('holds the element at the visible scroll origin rather than behind it', async () => {
			const container = box();
			stubScroll(container, {
				clientWidth: 200,
				clientHeight: 200,
				scrollWidth: 400,
				scrollHeight: 400,
				scrollLeft: 100,
				scrollTop: 100
			});
			const el = box({ width: 50, height: 50 });
			const drag = await setup(() =>
				useDraggable(el, { containerElement: () => container, restrictInView: true })
			);

			press(el, { x: 50, y: 50 });
			movePointer({ x: 0, y: 0 });

			expect(drag.position).toEqual({ x: 100, y: 100 });
		});

		it('unscrolls a container that was dragged past its content', async () => {
			const container = box();
			stubScroll(container, {
				clientWidth: 200,
				clientHeight: 200,
				scrollWidth: 400,
				scrollHeight: 400
			});
			container.scrollLeft = 250;
			container.scrollTop = 300;
			const el = box();
			await setup(() => useDraggable(el, { containerElement: () => container }));

			press(el);
			movePointer({ x: 10, y: 10 });

			expect(container.scrollLeft).toBe(200);
			expect(container.scrollTop).toBe(200);
		});

		it('pins the element in a container with no scroll area', async () => {
			// Faithful to VueUse, and the reason to pass a scrollable container:
			// a 0x0 one says the element may not go anywhere.
			const container = box();
			stubScroll(container);
			const el = box();
			const drag = await setup(() => useDraggable(el, { containerElement: () => container }));

			press(el);
			movePointer({ x: 10, y: 10 });

			expect(drag.position).toEqual({ x: 0, y: 0 });
			expect(container.scrollLeft).toBe(0);
		});

		it('does not constrain the axis it was told to ignore', async () => {
			const container = box();
			stubScroll(container, {
				clientWidth: 200,
				clientHeight: 200,
				scrollWidth: 400,
				scrollHeight: 400
			});
			const el = box({ width: 50, height: 50 });
			const drag = await setup(() =>
				useDraggable(el, { containerElement: () => container, axis: 'x' })
			);

			press(el);
			movePointer({ x: 5000, y: 5000 });

			// y is never assigned, so it keeps the initial value rather than the move.
			expect(drag.position).toEqual({ x: 350, y: 0 });
		});
	});

	describe('draggingElement', () => {
		it('hears the drag on the element it was given', async () => {
			const el = box();
			const scope = box();
			const drag = await setup(() => useDraggable(el, { draggingElement: () => scope }));

			press(el);
			// A window-level move is not part of this drag.
			movePointer({ x: 100, y: 0 });
			expect(drag.position).toEqual({ x: 0, y: 0 });

			scope.dispatchEvent(pointerEvent('pointermove', { x: 40, y: 0 }));
			expect(drag.position).toEqual({ x: 40, y: 0 });

			// Nor is a window-level release.
			release();
			expect(drag.isDragging).toBe(true);

			scope.dispatchEvent(pointerEvent('pointerup'));
			expect(drag.isDragging).toBe(false);
		});

		it('falls back to the window when it is nullish', async () => {
			// Not VueUse's behaviour: it binds nothing. Here a nullish element is
			// usually a target that has not resolved yet, and binding the window
			// means the drag works the moment it does.
			const el = box();
			const drag = await setup(() => useDraggable(el, { draggingElement: null }));

			press(el);
			movePointer({ x: 100, y: 0 });

			expect(drag.position).toEqual({ x: 100, y: 0 });
		});
	});
});
