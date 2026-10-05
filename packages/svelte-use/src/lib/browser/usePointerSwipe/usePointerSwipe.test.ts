// @vitest-environment jsdom
/**
 * jsdom implements neither `PointerEvent` nor pointer capture, so this file
 * installs both: a `PointerEvent` class carrying the properties the util reads,
 * and `setPointerCapture` / `releasePointerCapture` as no-ops that record the
 * pointer id, because "capture was requested" is one of the behaviours under
 * test and a jsdom that lacks the method would silently skip it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mountInitialized } from '../../../../test/fixtures/mount.ts';
import { usePointerSwipe } from './index.ts';

class FakePointerEvent extends MouseEvent {
	pointerId: number;
	pointerType: string;

	constructor(type: string, init: PointerEventInit = {}) {
		super(type, init);
		this.pointerId = init.pointerId ?? 1;
		this.pointerType = init.pointerType ?? 'mouse';
	}
}

type PointerInit = { x?: number; y?: number; pointerType?: string; buttons?: number };

/** Dispatches a pointer event with the properties the util reads. */
function pointer(el: Element, type: string, init: PointerInit = {}): void {
	// Defaults to what the platform actually reports: a button is held during
	// `down`/`move`, and `buttons` is 0 on `up`/`cancel`. Defaulting everything
	// to 1 hid a real bug where a mouse-up failed the "button down" filter and
	// never ended the gesture.
	const held = type === 'pointerdown' || type === 'pointermove' ? 1 : 0;
	el.dispatchEvent(
		new FakePointerEvent(type, {
			clientX: init.x ?? 0,
			clientY: init.y ?? 0,
			buttons: init.buttons ?? held,
			pointerId: 1,
			pointerType: init.pointerType ?? 'mouse',
			bubbles: true
		})
	);
}

const created: Element[] = [];

function box(): HTMLDivElement {
	const el = document.createElement('div');
	document.body.append(el);
	created.push(el);
	return el;
}

/** jsdom has no `setPointerCapture`; record the ids instead of throwing. */
function stubCapture(el: Element): string[] {
	const captured: string[] = [];
	(el as Partial<Element>).setPointerCapture = (id: number) => {
		captured.push(String(id));
	};
	return captured;
}

describe('usePointerSwipe', () => {
	beforeEach(() => {
		vi.stubGlobal('PointerEvent', FakePointerEvent);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		for (const el of created) el.remove();
		created.length = 0;
	});

	it('starts idle, pointing nowhere', async () => {
		const { api, dispose } = await mountInitialized(
			() => usePointerSwipe(() => box()),
			() => {}
		);
		expect(api.isSwiping).toBe(false);
		expect(api.direction).toBe('none');
		expect(api.distanceX).toBe(0);
		expect(api.distanceY).toBe(0);
		await dispose();
	});

	it('detects left when the pointer travels right-to-left', async () => {
		const el = box();
		const { api, dispose } = await mountInitialized(
			() => usePointerSwipe(() => el),
			() => {}
		);

		pointer(el, 'pointerdown', { x: 200, y: 100 });
		pointer(el, 'pointermove', { x: 100, y: 100 });

		expect(api.isSwiping).toBe(true);
		expect(api.direction).toBe('left');
		expect(api.distanceX).toBe(100);
		await dispose();
	});

	it('detects right, up and down', async () => {
		const cases = [
			{ to: { x: 300, y: 100 }, dir: 'right' },
			{ to: { x: 100, y: 0 }, dir: 'up' },
			{ to: { x: 100, y: 200 }, dir: 'down' }
		] as const;

		for (const { to, dir } of cases) {
			const el = box();
			const { api, dispose } = await mountInitialized(
				() => usePointerSwipe(() => el),
				() => {}
			);
			pointer(el, 'pointerdown', { x: 100, y: 100 });
			pointer(el, 'pointermove', to);

			expect(api.direction).toBe(dir);
			await dispose();
		}
	});

	it('stays "none" below the threshold', async () => {
		const el = box();
		const { api, dispose } = await mountInitialized(
			() => usePointerSwipe(() => el),
			() => {}
		);

		pointer(el, 'pointerdown', { x: 100, y: 100 });
		pointer(el, 'pointermove', { x: 120, y: 100 });

		expect(api.isSwiping).toBe(false);
		expect(api.direction).toBe('none');
		await dispose();
	});

	it('honours a lower threshold', async () => {
		const el = box();
		const { api, dispose } = await mountInitialized(
			() => usePointerSwipe(() => el, { threshold: 10 }),
			() => {}
		);

		pointer(el, 'pointerdown', { x: 100, y: 100 });
		pointer(el, 'pointermove', { x: 120, y: 100 });

		expect(api.isSwiping).toBe(true);
		await dispose();
	});

	it('reads threshold as a getter', async () => {
		const el = box();
		let threshold = 500;
		const { api, dispose } = await mountInitialized(
			() => usePointerSwipe(() => el, { threshold: () => threshold }),
			() => {}
		);

		pointer(el, 'pointerdown', { x: 100, y: 100 });
		pointer(el, 'pointermove', { x: 150, y: 100 });
		expect(api.isSwiping).toBe(false);

		threshold = 10;
		pointer(el, 'pointermove', { x: 140, y: 100 });
		expect(api.isSwiping).toBe(true);
		await dispose();
	});

	it('reports posStart and posEnd', async () => {
		const el = box();
		const { api, dispose } = await mountInitialized(
			() => usePointerSwipe(() => el),
			() => {}
		);

		pointer(el, 'pointerdown', { x: 10, y: 20 });
		expect(api.posStart).toEqual({ x: 10, y: 20 });
		expect(api.posEnd).toEqual({ x: 10, y: 20 });

		pointer(el, 'pointermove', { x: 60, y: 20 });
		expect(api.posEnd).toEqual({ x: 60, y: 20 });
		await dispose();
	});

	it('calls onSwipeStart, onSwipe and onSwipeEnd in order', async () => {
		const el = box();
		const calls: string[] = [];
		const { api, dispose } = await mountInitialized(
			() =>
				usePointerSwipe(() => el, {
					onSwipeStart: () => calls.push('start'),
					onSwipe: () => calls.push('move'),
					onSwipeEnd: (_e, direction) => calls.push(`end:${direction}`)
				}),
			() => {}
		);

		pointer(el, 'pointerdown', { x: 100, y: 100 });
		pointer(el, 'pointermove', { x: 40, y: 100 });
		pointer(el, 'pointerup', { x: 40, y: 100 });

		expect(calls).toEqual(['start', 'move', 'end:left']);
		expect(api.isSwiping).toBe(false);
		await dispose();
	});

	it('ignores moves before any pointerdown', async () => {
		const el = box();
		const onSwipe = vi.fn();
		const { api, dispose } = await mountInitialized(
			() => usePointerSwipe(() => el, { onSwipe }),
			() => {}
		);

		pointer(el, 'pointermove', { x: 0, y: 0 });

		expect(onSwipe).not.toHaveBeenCalled();
		expect(api.isSwiping).toBe(false);
		await dispose();
	});

	it('requests pointer capture so a drifting swipe keeps reporting', async () => {
		const el = box();
		const captured = stubCapture(el);
		const { dispose } = await mountInitialized(
			() => usePointerSwipe(() => el),
			() => {}
		);

		pointer(el, 'pointerdown', { x: 100, y: 100 });

		expect(captured).toEqual(['1']);
		await dispose();
	});

	it('filters by pointerTypes when given', async () => {
		const el = box();
		const onSwipeStart = vi.fn();
		const { dispose } = await mountInitialized(
			() => usePointerSwipe(() => el, { pointerTypes: ['touch'], onSwipeStart }),
			() => {}
		);

		pointer(el, 'pointerdown', { x: 10, y: 10, pointerType: 'mouse' });
		expect(onSwipeStart).not.toHaveBeenCalled();

		pointer(el, 'pointerdown', { x: 10, y: 10, pointerType: 'touch', buttons: 0 });
		expect(onSwipeStart).toHaveBeenCalledTimes(1);
		await dispose();
	});

	it('ignores a mouse event with no button down', async () => {
		const el = box();
		const onSwipeStart = vi.fn();
		const { dispose } = await mountInitialized(
			() => usePointerSwipe(() => el, { onSwipeStart }),
			() => {}
		);

		pointer(el, 'pointerdown', { x: 10, y: 10, buttons: 0 });
		expect(onSwipeStart).not.toHaveBeenCalled();
		await dispose();
	});

	it('ends a mouse swipe on pointerup, which carries buttons: 0', async () => {
		const el = box();
		const onSwipeEnd = vi.fn();
		let api: ReturnType<typeof usePointerSwipe>;
		const { dispose } = await mountInitialized(
			() => {
				api = usePointerSwipe(() => el, { threshold: 10, onSwipeEnd });
				return () => {};
			},
			() => {}
		);

		pointer(el, 'pointerdown', { x: 100, y: 100 });
		pointer(el, 'pointermove', { x: 20, y: 100 });
		expect(api!.isSwiping).toBe(true);

		// No `buttons` passed: the helper defaults a `pointerup` to 0, which is
		// what the platform reports. Re-filtering this event on "button down"
		// would drop it and leave `isSwiping` stuck true.
		pointer(el, 'pointerup', { x: 20, y: 100 });
		expect(onSwipeEnd).toHaveBeenCalledTimes(1);
		expect(api!.isSwiping).toBe(false);
		await dispose();
	});

	it('sets touch-action pan-y, and user-select when asked', async () => {
		const el = box();
		const { dispose } = await mountInitialized(
			() => usePointerSwipe(() => el),
			() => {}
		);
		expect(el.style.getPropertyValue('touch-action')).toBe('pan-y');
		await dispose();

		const styled = box();
		await mountInitialized(
			() => usePointerSwipe(() => styled, { disableTextSelect: true }),
			() => {}
		);
		expect(styled.style.getPropertyValue('user-select')).toBe('none');
		await new Promise((resolve) => setTimeout(resolve, 0));
	});

	it('resets swiping on pointercancel', async () => {
		const el = box();
		const onSwipeEnd = vi.fn();
		const { api, dispose } = await mountInitialized(
			() => usePointerSwipe(() => el, { onSwipeEnd }),
			() => {}
		);

		pointer(el, 'pointerdown', { x: 100, y: 100 });
		pointer(el, 'pointermove', { x: 20, y: 100 });
		pointer(el, 'pointercancel', { x: 20, y: 100 });

		expect(onSwipeEnd).toHaveBeenCalledWith(expect.anything(), 'left');
		expect(api.isSwiping).toBe(false);
		await dispose();
	});

	it('stop() detaches every listener', async () => {
		const el = box();
		const onSwipeStart = vi.fn();
		const { api, dispose } = await mountInitialized(
			() => usePointerSwipe(() => el, { onSwipeStart }),
			() => {}
		);

		api.stop();
		pointer(el, 'pointerdown', { x: 100, y: 100 });

		expect(onSwipeStart).not.toHaveBeenCalled();
		await dispose();
	});

	it('tolerates a target with no style, and no capture support', async () => {
		const target = new EventTarget();
		const { dispose } = await mountInitialized(
			() => usePointerSwipe(() => target),
			() => {}
		);

		expect(() =>
			pointer(target as unknown as Element, 'pointerdown', { x: 1, y: 1 })
		).not.toThrow();
		await dispose();
	});
});
