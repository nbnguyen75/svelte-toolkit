// @vitest-environment jsdom
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountInitialized } from '../../../../test/fixtures/mount.ts';
import { pointerEvent } from '../../../../test/fixtures/pointer.ts';
import type { PointerInit } from '../../../../test/fixtures/pointer.ts';
import { onClickOutside } from './index.ts';

/** Two elements so a click has somewhere to land outside or not. */
function pair(): { inside: HTMLDivElement; outside: HTMLButtonElement } {
	const inside = document.createElement('div');
	const outside = document.createElement('button');
	document.body.append(inside, outside);
	return { inside, outside };
}

/**
 * pointerdown then click, which is what a real mouse press delivers. Waits a
 * tick afterwards, because the util ignores a second click in the same tick.
 */
async function press(target: Element, init: PointerInit = {}): Promise<void> {
	target.dispatchEvent(pointerEvent('pointerdown', init));
	target.dispatchEvent(pointerEvent('click', init));
	await vi.advanceTimersByTimeAsync(1);
}

let handlers: Array<() => void>;
let timers: Array<() => void>;

beforeEach(() => {
	handlers = [];
	timers = [];
	vi.useFakeTimers();
});

afterEach(() => {
	vi.runOnlyPendingTimers();
	vi.useRealTimers();
	document.body.replaceChildren();
});

/** Mounts the util and registers teardown, which is what unsets the listeners. */
async function setup(create: () => ReturnType<typeof onClickOutside>): Promise<() => void> {
	const { dispose } = await mountInitialized(create, () => {});
	handlers.push(async () => {
		await dispose();
	});
	return async () => {
		await dispose();
	};
}

describe('onClickOutside', () => {
	it('calls the handler for a click outside the target', async () => {
		const { inside, outside } = pair();
		const handler = vi.fn();
		const teardown = await setup(() => onClickOutside(inside, handler));

		await press(outside);

		expect(handler).toHaveBeenCalledOnce();
		teardown();
	});

	it('passes the click event to the handler', async () => {
		const { inside, outside } = pair();
		const handler = vi.fn();
		const teardown = await setup(() => onClickOutside(inside, handler));

		await press(outside);

		expect(handler.mock.calls[0]?.[0].target).toBe(outside);
		teardown();
	});

	it('ignores a click inside the target', async () => {
		const { inside, outside } = pair();
		const handler = vi.fn();
		const teardown = await setup(() => onClickOutside(inside, handler));
		void outside;

		await press(inside);

		expect(handler).not.toHaveBeenCalled();
		teardown();
	});

	it('ignores a click on a descendant of the target', async () => {
		const { inside } = pair();
		const child = document.createElement('span');
		inside.append(child);
		const handler = vi.fn();
		const teardown = await setup(() => onClickOutside(inside, handler));

		await press(child);

		expect(handler).not.toHaveBeenCalled();
		teardown();
	});

	it('stays inert while the target is nullish', async () => {
		const { outside } = pair();
		const handler = vi.fn();
		const teardown = await setup(() => onClickOutside(null, handler));

		await press(outside);
		await press(outside);

		// There is no inside to be outside of, so there is nothing to report.
		expect(handler).not.toHaveBeenCalled();
		teardown();
	});

	it('keeps reporting after the target element is detached', async () => {
		const { inside, outside } = pair();
		const handler = vi.fn();
		const teardown = await setup(() => onClickOutside(inside, handler));
		// A detached element is still an element: clicks elsewhere are outside it,
		// which is VueUse's behaviour and the reason a caller nulls the target.
		inside.remove();

		await press(outside);

		expect(handler).toHaveBeenCalledOnce();
		teardown();
	});

	it('follows a target that resolves later', async () => {
		const { inside, outside } = pair();
		const source = createBox<HTMLDivElement | undefined>(undefined);
		const handler = vi.fn();
		const teardown = await setup(() => onClickOutside(() => source.value, handler));

		await press(outside);
		expect(handler).not.toHaveBeenCalled();

		source.value = inside;
		await tick();

		await press(inside);
		expect(handler).not.toHaveBeenCalled();

		await press(outside);
		expect(handler).toHaveBeenCalledOnce();
		teardown();
	});

	it('skips ignored elements', async () => {
		const { inside, outside } = pair();
		const handler = vi.fn();
		const teardown = await setup(() => onClickOutside(inside, handler, { ignore: [outside] }));

		await press(outside);
		expect(handler).not.toHaveBeenCalled();

		await press(document.body);
		expect(handler).toHaveBeenCalledOnce();
		teardown();
	});

	it('skips ignored CSS selectors', async () => {
		const { inside, outside } = pair();
		outside.classList.add('protected');
		const handler = vi.fn();
		const teardown = await setup(() => onClickOutside(inside, handler, { ignore: ['.protected'] }));

		await press(outside);
		expect(handler).not.toHaveBeenCalled();

		await press(document.body);
		expect(handler).toHaveBeenCalledOnce();
		teardown();
	});

	it('resolves ignored elements through a getter', async () => {
		const { inside, outside } = pair();
		const handler = vi.fn();
		const source = createBox([outside]);
		const teardown = await setup(() =>
			onClickOutside(inside, handler, { ignore: () => source.value })
		);

		await press(outside);
		expect(handler).not.toHaveBeenCalled();

		source.value = [];
		await press(outside);
		expect(handler).toHaveBeenCalledOnce();
		teardown();
	});

	it('ignores a keyboard-synthesised click on an ignored element', async () => {
		const { inside, outside } = pair();
		const handler = vi.fn();
		const teardown = await setup(() => onClickOutside(inside, handler, { ignore: [outside] }));

		// No pointerdown at all: `detail: 0` is how the platform marks these.
		outside.dispatchEvent(pointerEvent('click', { detail: 0 }));

		expect(handler).not.toHaveBeenCalled();
		teardown();
	});

	it('reports a keyboard-synthesised click outside the target', async () => {
		const { inside, outside } = pair();
		const handler = vi.fn();
		const teardown = await setup(() => onClickOutside(inside, handler));

		outside.dispatchEvent(pointerEvent('click', { detail: 0 }));

		expect(handler).toHaveBeenCalledOnce();
		teardown();
	});

	it('re-arms after swallowing an inside click', async () => {
		const { inside, outside } = pair();
		const handler = vi.fn();
		const teardown = await setup(() => onClickOutside(inside, handler));

		// The first click is swallowed, which must not disarm the next one.
		await press(inside);
		await press(outside);

		expect(handler).toHaveBeenCalledOnce();
		teardown();
	});

	it('handles only one click per tick', async () => {
		const { inside, outside } = pair();
		const handler = vi.fn();
		const teardown = await setup(() => onClickOutside(inside, handler));

		// Dispatched back to back, with no tick in between: a touch press also
		// produces a compatibility mouse click, and the handler would run twice.
		outside.dispatchEvent(pointerEvent('click'));
		outside.dispatchEvent(pointerEvent('click'));
		expect(handler).toHaveBeenCalledOnce();

		await vi.runAllTimersAsync();
		outside.dispatchEvent(pointerEvent('click'));
		expect(handler).toHaveBeenCalledTimes(2);
		teardown();
	});

	it('cancel swallows the next click and then resumes', async () => {
		const { inside, outside } = pair();
		const handler = vi.fn();
		let controller!: ReturnType<typeof onClickOutside>;
		const teardown = await setup(() => {
			controller = onClickOutside(inside, handler);
			return controller;
		});

		controller.cancel();
		await press(outside);
		expect(handler).not.toHaveBeenCalled();

		await press(outside);
		expect(handler).toHaveBeenCalledOnce();
		teardown();
	});

	it('cancel swallows a keyboard-synthesised click too', async () => {
		const { inside, outside } = pair();
		const handler = vi.fn();
		let controller!: ReturnType<typeof onClickOutside>;
		const teardown = await setup(() => {
			controller = onClickOutside(inside, handler);
			return controller;
		});

		controller.cancel();
		outside.dispatchEvent(pointerEvent('click', { detail: 0 }));
		expect(handler).not.toHaveBeenCalled();
		teardown();
	});

	it('stop removes the listeners', async () => {
		const { inside, outside } = pair();
		const handler = vi.fn();
		let controller!: ReturnType<typeof onClickOutside>;
		const teardown = await setup(() => {
			controller = onClickOutside(inside, handler);
			return controller;
		});

		controller.stop();
		await press(outside);

		expect(handler).not.toHaveBeenCalled();
		teardown();
	});

	it('reports a click that happens while capture is off', async () => {
		const { inside, outside } = pair();
		const handler = vi.fn();
		const teardown = await setup(() => onClickOutside(inside, handler, { capture: false }));

		await press(outside);

		expect(handler).toHaveBeenCalledOnce();
		teardown();
	});

	it('sees a click whose propagation another listener stopped', async () => {
		const { inside, outside } = pair();
		const handler = vi.fn();
		// A listener on an ancestor that kills propagation: only the capture
		// phase still sees the event, which is why `capture` defaults to true.
		const blocker = (event: Event) => event.stopPropagation();
		document.addEventListener('click', blocker);

		const teardown = await setup(() => onClickOutside(inside, handler, { capture: true }));
		await press(outside);
		expect(handler).toHaveBeenCalledOnce();
		teardown();

		document.removeEventListener('click', blocker);
	});

	it('misses such a click when capture is off', async () => {
		const { inside, outside } = pair();
		const handler = vi.fn();
		const blocker = (event: Event) => event.stopPropagation();
		document.addEventListener('click', blocker);

		const teardown = await setup(() => onClickOutside(inside, handler, { capture: false }));
		await press(outside);
		expect(handler).not.toHaveBeenCalled();
		teardown();

		document.removeEventListener('click', blocker);
	});

	it('removes the listeners on unmount', async () => {
		const { inside, outside } = pair();
		const handler = vi.fn();
		await setup(() => onClickOutside(inside, handler));

		for (const teardown of handlers) await teardown();
		await press(outside);

		expect(handler).not.toHaveBeenCalled();
	});
});
