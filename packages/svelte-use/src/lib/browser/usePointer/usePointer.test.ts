// @vitest-environment jsdom
import { tick } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountUtil } from '../../../../test/fixtures/mount.ts';
import { pointerEvent } from '../../../../test/fixtures/pointer.ts';
import type { PointerInit } from '../../../../test/fixtures/pointer.ts';
import { usePointer } from './index.ts';

/** Every `usePointer` under test is torn down at the end of its own test. */
const mounted: (() => Promise<void>)[] = [];

afterEach(async () => {
	for (const dispose of mounted.splice(0)) await dispose();
});

async function setup(options?: Parameters<typeof usePointer>[0]) {
	const { api, dispose } = await mountUtil(() => usePointer(options));
	mounted.push(dispose);
	return api;
}

function pointerMove(init: PointerInit = {}): void {
	window.dispatchEvent(pointerEvent('pointermove', init));
}

describe('usePointer', () => {
	it('reports zeroes and no pointer type before any event', async () => {
		const pointer = await setup();

		expect(pointer.x).toBe(0);
		expect(pointer.y).toBe(0);
		expect(pointer.pointerId).toBe(0);
		expect(pointer.pressure).toBe(0);
		expect(pointer.pointerType).toBeNull();
		expect(pointer.isInside).toBe(false);
	});

	it('is not inside until an event arrives', async () => {
		const pointer = await setup();

		expect(pointer.isInside).toBe(false);
		pointerMove();
		expect(pointer.isInside).toBe(true);
	});

	it('reports the position of a move', async () => {
		const pointer = await setup();

		pointerMove({ x: 12, y: 34 });

		expect(pointer.x).toBe(12);
		expect(pointer.y).toBe(34);
	});

	it('reads x and y, not clientX and clientY', async () => {
		const pointer = await setup();

		// A client position of 100/200 is also the pointer's x/y, so this only
		// proves the fields come off the event at all - the point is that
		// nothing subtracts a target rect.
		pointerMove({ x: 100, y: 200 });

		expect(pointer.x).toBe(100);
		expect(pointer.y).toBe(200);
	});

	it('reports the pressure', async () => {
		const pointer = await setup();

		pointerMove({ pressure: 0.75 });

		expect(pointer.pressure).toBe(0.75);
	});

	it('reports the tilt', async () => {
		const pointer = await setup();

		pointerMove({ tiltX: -30, tiltY: 45 });

		expect(pointer.tiltX).toBe(-30);
		expect(pointer.tiltY).toBe(45);
	});

	it('reports the contact geometry', async () => {
		const pointer = await setup();

		pointerMove({ width: 21, height: 33 });

		expect(pointer.width).toBe(21);
		expect(pointer.height).toBe(33);
	});

	it('reports the twist', async () => {
		const pointer = await setup();

		pointerMove({ twist: 90 });

		expect(pointer.twist).toBe(90);
	});

	it('reports the pointer id and kind', async () => {
		const pointer = await setup();

		pointerMove({ pointerId: 7, pointerType: 'pen' });

		expect(pointer.pointerId).toBe(7);
		expect(pointer.pointerType).toBe('pen');
	});

	it('keeps a custom pointer kind rather than forcing it into a union', async () => {
		const pointer = await setup();

		pointerMove({ pointerType: 'eraser' });

		expect(pointer.pointerType).toBe('eraser');
	});

	it.each(['pointerdown', 'pointermove', 'pointerup'] as const)('records on %s', async (type) => {
		const pointer = await setup();

		window.dispatchEvent(pointerEvent(type, { x: 5, y: 6 }));

		expect(pointer.x).toBe(5);
		expect(pointer.y).toBe(6);
	});

	it('overwrites the whole state on every event', async () => {
		const pointer = await setup();

		pointerMove({ x: 10, y: 20, pointerId: 3, pointerType: 'pen', pressure: 0.9 });
		pointerMove({ x: 1, y: 2, pointerId: 4, pointerType: 'touch' });

		expect(pointer.x).toBe(1);
		expect(pointer.y).toBe(2);
		expect(pointer.pointerId).toBe(4);
		expect(pointer.pointerType).toBe('touch');
		// Not carried over: a fresh event's value, or its zero, never the old one.
		expect(pointer.pressure).toBe(0);
	});

	it('honours initialValue', async () => {
		const pointer = await setup({ initialValue: { x: 30, y: 40, pointerType: 'pen' } });

		expect(pointer.x).toBe(30);
		expect(pointer.y).toBe(40);
		expect(pointer.pointerType).toBe('pen');
		// Fields it said nothing about stay zero.
		expect(pointer.pressure).toBe(0);
	});

	it('lets the first event overwrite initialValue', async () => {
		const pointer = await setup({ initialValue: { x: 30, y: 40 } });

		pointerMove({ x: 1, y: 2 });

		expect(pointer.x).toBe(1);
		expect(pointer.y).toBe(2);
	});

	describe('isInside', () => {
		it('clears on pointerleave', async () => {
			const pointer = await setup();

			pointerMove();
			expect(pointer.isInside).toBe(true);

			window.dispatchEvent(pointerEvent('pointerleave'));
			expect(pointer.isInside).toBe(false);
		});

		it('clears on pointercancel', async () => {
			const pointer = await setup();

			pointerMove();
			window.dispatchEvent(pointerEvent('pointercancel'));

			expect(pointer.isInside).toBe(false);
		});

		it('keeps the last known state when the pointer leaves', async () => {
			const pointer = await setup();

			pointerMove({ x: 7, y: 8, pressure: 0.5 });
			window.dispatchEvent(pointerEvent('pointerleave'));

			// Only the flag moves. Where the pointer went is still the last thing
			// it reported, which is what a caller tracking a drag needs.
			expect(pointer.isInside).toBe(false);
			expect(pointer.x).toBe(7);
			expect(pointer.pressure).toBe(0.5);
		});

		it('comes back on the next event', async () => {
			const pointer = await setup();

			window.dispatchEvent(pointerEvent('pointerleave'));
			expect(pointer.isInside).toBe(false);

			pointerMove();
			expect(pointer.isInside).toBe(true);
		});
	});

	describe('pointerTypes', () => {
		it('reports every kind when unset', async () => {
			const pointer = await setup();

			pointerMove({ pointerType: 'touch' });
			expect(pointer.pointerType).toBe('touch');

			pointerMove({ pointerType: 'pen' });
			expect(pointer.pointerType).toBe('pen');
		});

		it('ignores a kind that is not listed', async () => {
			const pointer = await setup({ pointerTypes: ['pen'] });

			pointerMove({ x: 99, pointerType: 'touch' });

			expect(pointer.x).toBe(0);
			expect(pointer.pointerType).toBeNull();
		});

		it('still marks a filtered-out pointer as inside', async () => {
			const pointer = await setup({ pointerTypes: ['pen'] });

			// VueUse sets the flag before filtering, so a touch over a pen-only
			// target still counts as inside.
			pointerMove({ pointerType: 'touch' });

			expect(pointer.isInside).toBe(true);
			expect(pointer.x).toBe(0);
		});

		it('keeps reporting a listed kind after ignoring another', async () => {
			const pointer = await setup({ pointerTypes: ['mouse', 'pen'] });

			pointerMove({ x: 50, pointerType: 'touch' });
			pointerMove({ x: 60, pointerType: 'mouse' });

			expect(pointer.x).toBe(60);
		});

		it('re-reads a getter per event', async () => {
			let allowed = false;
			const pointer = await setup({ pointerTypes: () => (allowed ? ['pen'] : ['mouse']) });

			pointerMove({ x: 1, pointerType: 'pen' });
			expect(pointer.x).toBe(0);

			allowed = true;
			pointerMove({ x: 2, pointerType: 'pen' });
			expect(pointer.x).toBe(2);
		});
	});

	describe('target', () => {
		it('listens on window by default', async () => {
			const pointer = await setup();

			pointerMove({ x: 3 });

			expect(pointer.x).toBe(3);
		});

		it('listens on a named element', async () => {
			const el = document.createElement('div');
			document.body.append(el);
			const pointer = await setup({ target: el });

			el.dispatchEvent(pointerEvent('pointermove', { x: 11 }));
			expect(pointer.x).toBe(11);

			// The default is not also in play.
			window.dispatchEvent(pointerEvent('pointermove', { x: 99 }));
			expect(pointer.x).toBe(11);
		});

		it('follows a getter that changes target', async () => {
			const first = document.createElement('div');
			const second = document.createElement('div');
			document.body.append(first, second);
			const target = createBox<HTMLElement>(first);
			const pointer = await setup({ target: () => target.value });

			first.dispatchEvent(pointerEvent('pointermove', { x: 1 }));
			expect(pointer.x).toBe(1);

			target.value = second;
			await tick();
			first.dispatchEvent(pointerEvent('pointermove', { x: 50 }));
			second.dispatchEvent(pointerEvent('pointermove', { x: 2 }));
			expect(pointer.x).toBe(2);
		});

		it('binds nothing when a named target resolves to null', async () => {
			const pointer = await setup({ target: () => null });

			pointerMove({ x: 42 });

			// Not window: a named target that is not ready must not silently
			// widen the scope to the whole page.
			expect(pointer.x).toBe(0);
			expect(pointer.isInside).toBe(false);
		});

		it('treats an explicitly undefined target as the default', async () => {
			const pointer = await setup({ target: undefined });

			pointerMove({ x: 42 });

			// `target: undefined` is the same as saying nothing, so this is window.
			expect(pointer.x).toBe(42);
		});
	});

	it('removes its listeners on unmount', async () => {
		const { api, dispose } = await mountUtil(() => usePointer());

		window.dispatchEvent(pointerEvent('pointermove', { x: 5 }));
		expect(api.x).toBe(5);

		await dispose();
		window.dispatchEvent(pointerEvent('pointermove', { x: 99 }));

		expect(api.x).toBe(5);
	});
});
