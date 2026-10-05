// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { tick } from 'svelte';

import { mockRaf } from '../../../../test/fixtures/raf.ts';
import { mountUtil } from '../../../../test/fixtures/mount.ts';
import { useTimestamp } from './index.ts';

describe('useTimestamp', () => {
	it('starts at the current epoch milliseconds', async () => {
		mockRaf();
		vi.useFakeTimers({ toFake: ['Date'] });
		try {
			vi.setSystemTime(new Date('2026-03-04T05:06:07.008Z'));
			const { api, dispose } = await mountUtil(() => useTimestamp());
			try {
				expect(api.timestamp).toBe(Date.parse('2026-03-04T05:06:07.008Z'));
			} finally {
				await dispose();
			}
		} finally {
			vi.useRealTimers();
		}
	});

	it('adds `offset` to the initial value and every update', async () => {
		const raf = mockRaf();
		vi.useFakeTimers({ toFake: ['Date'] });
		try {
			const base = Date.parse('2026-03-04T05:06:07.000Z');
			vi.setSystemTime(new Date(base));
			const { api, dispose } = await mountUtil(() => useTimestamp({ offset: -8 * 60 * 60 * 1000 }));
			try {
				expect(api.timestamp).toBe(base - 8 * 60 * 60 * 1000);

				vi.setSystemTime(new Date(base + 1000));
				await tick();
				raf.step(16);

				expect(api.timestamp).toBe(base + 1000 - 8 * 60 * 60 * 1000);
			} finally {
				await dispose();
			}
		} finally {
			vi.useRealTimers();
		}
	});

	it('defaults `offset` to zero', async () => {
		mockRaf();
		vi.useFakeTimers({ toFake: ['Date'] });
		try {
			const base = Date.parse('2026-03-04T05:06:07.000Z');
			vi.setSystemTime(new Date(base));
			const { api, dispose } = await mountUtil(() => useTimestamp({}));
			try {
				expect(api.timestamp).toBe(base);
			} finally {
				await dispose();
			}
		} finally {
			vi.useRealTimers();
		}
	});

	it('updates on every frame from the wall clock', async () => {
		const raf = mockRaf();
		vi.useFakeTimers({ toFake: ['Date'] });
		try {
			const base = Date.parse('2026-03-04T05:06:07.000Z');
			vi.setSystemTime(new Date(base));
			const { api, dispose } = await mountUtil(() => useTimestamp());
			try {
				for (let frame = 1; frame <= 3; frame++) {
					vi.setSystemTime(new Date(base + frame * 100));
					await tick();
					// Frame timestamps that disagree with the clock on purpose.
					raf.step(frame * 999);

					expect(api.timestamp).toBe(base + frame * 100);
				}
			} finally {
				await dispose();
			}
		} finally {
			vi.useRealTimers();
		}
	});

	it('may legitimately repeat a value when the clock has not ticked', async () => {
		const raf = mockRaf();
		vi.useFakeTimers({ toFake: ['Date'] });
		try {
			const base = Date.parse('2026-03-04T05:06:07.000Z');
			vi.setSystemTime(new Date(base));
			const updates: number[] = [];
			const { api, dispose } = await mountUtil(() =>
				useTimestamp({ callback: (value) => updates.push(value) })
			);
			try {
				// Two frames inside one millisecond: a 120Hz display does this.
				for (const frame of [16, 32]) {
					await tick();
					raf.step(frame);
				}

				expect(updates).toEqual([base, base]);
				expect(api.timestamp).toBe(base);
			} finally {
				await dispose();
			}
		} finally {
			vi.useRealTimers();
		}
	});

	it('calls `callback` once per frame with the new value', async () => {
		const raf = mockRaf();
		vi.useFakeTimers({ toFake: ['Date'] });
		try {
			const base = Date.parse('2026-03-04T05:06:07.000Z');
			vi.setSystemTime(new Date(base));
			const callback = vi.fn();
			const { api, dispose } = await mountUtil(() => useTimestamp({ callback }));
			try {
				expect(callback).not.toHaveBeenCalled();

				for (const [frame, elapsed] of [
					[16, 250],
					[32, 750]
				] as const) {
					vi.setSystemTime(new Date(base + elapsed));
					await tick();
					raf.step(frame);
				}

				expect(callback).toHaveBeenCalledTimes(2);
				expect(callback).toHaveBeenNthCalledWith(1, base + 250);
				expect(callback).toHaveBeenNthCalledWith(2, base + 750);
			} finally {
				await dispose();
			}
		} finally {
			vi.useRealTimers();
		}
	});

	it('has already updated the state when `callback` runs', async () => {
		const raf = mockRaf();
		vi.useFakeTimers({ toFake: ['Date'] });
		try {
			const base = Date.parse('2026-03-04T05:06:07.000Z');
			vi.setSystemTime(new Date(base));
			let seen: number | undefined;
			let fromState: number | undefined;
			const { api, dispose } = await mountUtil(() =>
				useTimestamp({
					callback: (value) => {
						seen = value;
						fromState = api.timestamp;
					}
				})
			);
			try {
				vi.setSystemTime(new Date(base + 500));
				await tick();
				raf.step(16);

				expect(seen).toBe(base + 500);
				expect(fromState).toBe(base + 500);
			} finally {
				await dispose();
			}
		} finally {
			vi.useRealTimers();
		}
	});

	it('passes the offset-adjusted value to `callback`', async () => {
		const raf = mockRaf();
		vi.useFakeTimers({ toFake: ['Date'] });
		try {
			const base = Date.parse('2026-03-04T05:06:07.000Z');
			vi.setSystemTime(new Date(base));
			const callback = vi.fn();
			const { dispose } = await mountUtil(() => useTimestamp({ offset: 1000, callback }));
			try {
				await tick();
				raf.step(16);

				expect(callback).toHaveBeenCalledWith(base + 1000);
			} finally {
				await dispose();
			}
		} finally {
			vi.useRealTimers();
		}
	});

	it('is running by default and freezes while paused', async () => {
		const raf = mockRaf();
		vi.useFakeTimers({ toFake: ['Date'] });
		try {
			const base = Date.parse('2026-03-04T05:06:07.000Z');
			vi.setSystemTime(new Date(base));
			const { api, dispose } = await mountUtil(() => useTimestamp());
			try {
				expect(api.isActive).toBe(true);

				api.pause();
				expect(api.isActive).toBe(false);

				const frozen = api.timestamp;
				vi.setSystemTime(new Date(base + 5000));
				await tick();
				raf.step(16);
				expect(api.timestamp).toBe(frozen);

				api.resume();
				await tick();
				raf.step(32);
				expect(api.timestamp).toBe(base + 5000);
			} finally {
				await dispose();
			}
		} finally {
			vi.useRealTimers();
		}
	});

	it('drops the pending frame and stops calling back on unmount', async () => {
		const raf = mockRaf();
		vi.useFakeTimers({ toFake: ['Date'] });
		try {
			const callback = vi.fn();
			const { api, dispose } = await mountUtil(() => useTimestamp({ callback }));
			await tick();
			expect(raf.pending).toBe(true);

			await dispose();

			expect(raf.pending).toBe(false);
			expect(api.isActive).toBe(false);
			raf.step(48);
			expect(callback).not.toHaveBeenCalled();
		} finally {
			vi.useRealTimers();
		}
	});

	it('is inert with no requestAnimationFrame, as on the server', async () => {
		mockRaf();
		vi.useFakeTimers({ toFake: ['Date'] });
		try {
			const base = Date.parse('2026-03-04T05:06:07.000Z');
			vi.setSystemTime(new Date(base));
			Reflect.deleteProperty(window, 'requestAnimationFrame');
			Reflect.deleteProperty(window, 'cancelAnimationFrame');

			const callback = vi.fn();
			const { api, dispose } = await mountUtil(() => useTimestamp({ callback }));
			try {
				expect(api.timestamp).toBe(base);
				expect(api.isActive).toBe(false);

				api.resume();
				expect(api.isActive).toBe(false);
				api.pause();
				expect(callback).not.toHaveBeenCalled();
			} finally {
				await dispose();
			}
		} finally {
			vi.useRealTimers();
			mockRaf();
		}
	});
});
