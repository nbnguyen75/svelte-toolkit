// @vitest-environment jsdom
/**
 * jsdom implements `elementFromPoint` / `elementsFromPoint` as a stub that always
 * returns `null`, so every test replaces them with something that reads a map.
 *
 * The rAF loop is driven with real frames rather than fake ones: `useRafFn`
 * schedules through `requestAnimationFrame`, which `vi.useFakeTimers()` replaces
 * with a stub unless `requestAnimationFrame` is explicitly in `toFake`, and
 * faking it means hand-rolling the loop this file is meant to be testing. Real
 * jsdom frames cost ~16ms each, so the file awaits only as many as it needs.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mountInitialized } from '../../../../test/fixtures/mount.ts';
import { useElementByPoint } from './index.ts';

/** Awaits `count` real animation frames, so the loop's writes have landed. */
async function frames(count = 1): Promise<void> {
	for (let i = 0; i < count; i++) {
		await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
	}
}

const A = 'a';
const B = 'b';

let x = 0;
let y = 0;

/** The platform call as a spy, for `.mock.calls` assertions. */
const spyOn = (name: 'elementFromPoint' | 'elementsFromPoint') =>
	document[name] as unknown as ReturnType<typeof vi.fn>;

describe('useElementByPoint', () => {
	beforeEach(() => {
		x = 0;
		y = 0;
		document.body.innerHTML = `<div id="${A}"></div><span id="${B}"></span>`;
		document.elementFromPoint = vi.fn(() => document.getElementById(A));
		document.elementsFromPoint = vi.fn(() => [
			document.getElementById(A),
			document.getElementById(B)
		]);
	});

	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('hits the topmost element by default', async () => {
		const { api, dispose } = await mountInitialized(
			() => useElementByPoint({ x: () => x, y: () => y }),
			() => {}
		);
		await frames();

		expect(api.element).toBe(document.getElementById(A));
		await dispose();
	});

	it('passes the current x and y to the platform call', async () => {
		const { dispose } = await mountInitialized(
			() => useElementByPoint({ x: () => x, y: () => y }),
			() => {}
		);
		await frames();
		expect(spyOn('elementFromPoint').mock.calls.at(-1)).toEqual([0, 0]);

		x = 12;
		y = 34;
		await frames();
		expect(spyOn('elementFromPoint').mock.calls.at(-1)).toEqual([12, 34]);
		await dispose();
	});

	it('returns every element when multiple is true', async () => {
		const { api, dispose } = await mountInitialized(
			() => useElementByPoint({ x: () => x, y: () => y, multiple: true }),
			() => {}
		);
		await frames();

		expect(api.element).toEqual([document.getElementById(A), document.getElementById(B)]);
		expect(spyOn('elementsFromPoint')).toHaveBeenCalled();
		await dispose();
	});

	it('reads multiple as a getter, switching which platform call is used', async () => {
		let many = false;
		const { dispose } = await mountInitialized(
			() => useElementByPoint({ x: () => x, y: () => y, multiple: () => many }),
			() => {}
		);
		await frames();
		expect(spyOn('elementsFromPoint')).not.toHaveBeenCalled();

		many = true;
		await frames();
		expect(spyOn('elementsFromPoint')).toHaveBeenCalled();
		await dispose();
	});

	it('accepts plain values as well as getters', async () => {
		const { dispose } = await mountInitialized(
			() => useElementByPoint({ x: 7, y: 9 }),
			() => {}
		);
		await frames();

		expect(spyOn('elementFromPoint').mock.calls.at(-1)).toEqual([7, 9]);
		await dispose();
	});

	it('reports isSupported true in jsdom', async () => {
		const { api, dispose } = await mountInitialized(
			() => useElementByPoint({ x: () => x, y: () => y }),
			() => {}
		);
		expect(api.isSupported).toBe(true);
		await dispose();
	});

	it('stops hit-testing while paused and picks up again on resume', async () => {
		const { api, dispose } = await mountInitialized(
			() => useElementByPoint({ x: () => x, y: () => y }),
			() => {}
		);
		await frames();

		api.pause();
		expect(api.isActive).toBe(false);
		spyOn('elementFromPoint').mockClear();
		await frames(2);
		expect(spyOn('elementFromPoint')).not.toHaveBeenCalled();

		api.resume();
		expect(api.isActive).toBe(true);
		await frames(2);
		expect(spyOn('elementFromPoint')).toHaveBeenCalled();
		await dispose();
	});

	it('leaves element null when the document cannot hit-test', async () => {
		// A document with neither method: the util must not throw and must not
		// invent an element.
		for (const name of ['elementFromPoint', 'elementsFromPoint'] as const) {
			Object.defineProperty(document, name, { configurable: true, value: undefined });
		}

		const { api, dispose } = await mountInitialized(
			() => useElementByPoint({ x: () => x, y: () => y }),
			() => {}
		);
		await frames(2);

		expect(api.element).toBe(null);
		await dispose();
	});
});
