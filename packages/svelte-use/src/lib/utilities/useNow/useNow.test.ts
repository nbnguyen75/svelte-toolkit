// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { tick } from 'svelte';

import { mockRaf } from '../../../../test/fixtures/raf.ts';
import { mountUtil } from '../../../../test/fixtures/mount.ts';
import { useNow } from './index.ts';

describe('useNow', () => {
	it('starts with the current date', async () => {
		mockRaf();
		const before = Date.now();
		const { api, dispose } = await mountUtil(() => useNow());
		try {
			expect(api.now).toBeInstanceOf(Date);
			expect(api.now.getTime()).toBeGreaterThanOrEqual(before);
			expect(api.now.getTime()).toBeLessThanOrEqual(Date.now());
		} finally {
			await dispose();
		}
	});

	it('is running by default', async () => {
		mockRaf();
		const { api, dispose } = await mountUtil(() => useNow());
		try {
			expect(api.isActive).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('replaces the date with a new instance on every frame', async () => {
		const raf = mockRaf();
		const { api, dispose } = await mountUtil(() => useNow());
		try {
			const first = api.now;
			await tick();

			raf.step(16);

			expect(api.now).toBeInstanceOf(Date);
			expect(api.now).not.toBe(first);
		} finally {
			await dispose();
		}
	});

	it('keeps updating across consecutive frames', async () => {
		const raf = mockRaf();
		const { api, dispose } = await mountUtil(() => useNow());
		try {
			const seen = new Set<Date>();
			for (let frame = 1; frame <= 3; frame++) {
				await tick();
				raf.step(frame * 16);
				seen.add(api.now);
			}

			expect(seen.size).toBe(3);
		} finally {
			await dispose();
		}
	});

	it('reads from the wall clock, not from the frame timestamp', async () => {
		const raf = mockRaf();
		// `Date` is deliberately not faked here. `SvelteDate` extends whichever
		// `Date` was live when `svelte/reactivity` was imported, so a replacement
		// installed by `vi.setSystemTime` afterwards never reaches its
		// constructor. Asserting on real epoch milliseconds avoids the trap
		// instead of stepping into it.
		const before = Date.now();
		const { api, dispose } = await mountUtil(() => useNow());
		try {
			await tick();
			// A frame timestamp that deliberately disagrees with the clock: 1234
			// milliseconds since the page started is not a plausible date.
			raf.step(1234);

			expect(api.now.getTime()).toBeGreaterThanOrEqual(before);
			// Any real epoch reading is past 2001-09-09; a frame timestamp is small.
			expect(api.now.getTime()).toBeGreaterThan(1_000_000_000_000);
		} finally {
			await dispose();
		}
	});

	it('freezes the value while paused and resumes where the clock stands', async () => {
		const raf = mockRaf();
		const { api, dispose } = await mountUtil(() => useNow());
		try {
			await tick();
			raf.step(16);

			api.pause();
			expect(api.isActive).toBe(false);

			const frozen = api.now;
			await tick();
			raf.step(32);

			// Identity, not value: two frames inside the same millisecond would
			// produce equal dates anyway, so only the instance proves it froze.
			expect(api.now).toBe(frozen);

			api.resume();
			expect(api.isActive).toBe(true);
			await tick();
			raf.step(48);

			// Resumed, not catching up: one new instance per frame, no burst for
			// the frames that elapsed while paused.
			expect(api.now).not.toBe(frozen);
			expect(api.now.getTime()).toBeGreaterThanOrEqual(frozen.getTime());
		} finally {
			await dispose();
		}
	});

	it('reads `isActive` live off the object, while a destructured copy freezes', async () => {
		mockRaf();
		const { api, dispose } = await mountUtil(() => useNow());
		try {
			expect(api.isActive).toBe(true);

			api.pause();
			expect(api.isActive).toBe(false);
			api.resume();
			expect(api.isActive).toBe(true);

			// The documented limit, pinned because it is the silent failure mode:
			// `isActive` is a getter on the object `useRafFn` returned, so
			// destructuring reads it once and copies that boolean. Reading through
			// the returned object is the only live form.
			const { isActive } = api;
			api.pause();

			expect(isActive).toBe(true);
			expect(api.isActive).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('does not resume automatically after pause', async () => {
		const raf = mockRaf();
		const { api, dispose } = await mountUtil(() => useNow());
		try {
			api.pause();
			await tick();

			expect(raf.pending).toBe(false);
			expect(api.isActive).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('schedules a frame after each executed one', async () => {
		const raf = mockRaf();
		const { api, dispose } = await mountUtil(() => useNow());
		try {
			await tick();
			expect(raf.pending).toBe(true);

			raf.step(16);
			expect(raf.pending).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('drops the pending frame on unmount', async () => {
		const raf = mockRaf();
		const { api, dispose } = await mountUtil(() => useNow());
		expect(raf.pending).toBe(true);

		await dispose();

		expect(raf.pending).toBe(false);
		expect(api.isActive).toBe(false);
	});

	it('survives repeated pause and resume cycles', async () => {
		const raf = mockRaf();
		const { api, dispose } = await mountUtil(() => useNow());
		try {
			for (let cycle = 0; cycle < 3; cycle++) {
				api.pause();
				expect(api.isActive).toBe(false);
				api.resume();
				expect(api.isActive).toBe(true);
				await tick();
				raf.step(cycle * 16);
			}

			expect(api.now).toBeInstanceOf(Date);
		} finally {
			await dispose();
		}
	});

	it('is inert with no requestAnimationFrame, as on the server', async () => {
		const raf = mockRaf();
		Reflect.deleteProperty(window, 'requestAnimationFrame');
		Reflect.deleteProperty(window, 'cancelAnimationFrame');
		try {
			const { api, dispose } = await mountUtil(() => useNow());
			try {
				expect(api.now).toBeInstanceOf(Date);
				expect(api.isActive).toBe(false);
				// Both controls stay callable and no-op rather than throwing.
				api.resume();
				expect(api.isActive).toBe(false);
				api.pause();
				expect(api.isActive).toBe(false);
				expect(raf.pending).toBe(false);
			} finally {
				await dispose();
			}
		} finally {
			mockRaf();
		}
	});
});
