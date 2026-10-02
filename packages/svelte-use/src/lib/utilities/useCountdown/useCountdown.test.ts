// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mountUtil } from '../../../../test/fixtures/mount.ts';
import { useCountdown } from './index.ts';

afterEach(() => {
	vi.useRealTimers();
});

describe('useCountdown', () => {
	it('ticks down to zero, completes once, then stops', async () => {
		vi.useFakeTimers();
		const onTick = vi.fn();
		const onComplete = vi.fn();
		const { api, dispose } = await mountUtil(() => useCountdown(3, { onComplete, onTick }));
		try {
			expect(api.remaining).toBe(3);
			expect(api.isActive).toBe(false);
			api.start();
			expect(api.isActive).toBe(true);
			vi.advanceTimersByTime(1000);
			expect(api.remaining).toBe(2);
			expect(onTick).toHaveBeenCalledTimes(1);
			vi.advanceTimersByTime(2000);
			expect(api.remaining).toBe(0);
			expect(onTick).toHaveBeenCalledTimes(3);
			expect(onComplete).toHaveBeenCalledTimes(1);
			expect(api.isActive).toBe(false);
			vi.advanceTimersByTime(5000);
			expect(onTick).toHaveBeenCalledTimes(3);
			expect(onComplete).toHaveBeenCalledTimes(1);
		} finally {
			await dispose();
		}
	});

	it('never reports a negative remaining value', async () => {
		vi.useFakeTimers();
		const { api, dispose } = await mountUtil(() => useCountdown(2));
		try {
			api.start();
			vi.advanceTimersByTime(10000);
			expect(api.remaining).toBe(0);
		} finally {
			await dispose();
		}
	});

	it('resume is a no-op when finished or already active', async () => {
		vi.useFakeTimers();
		const onComplete = vi.fn();
		const { api, dispose } = await mountUtil(() => useCountdown(1, { onComplete }));
		try {
			api.start();
			api.resume();
			vi.advanceTimersByTime(1000);
			expect(onComplete).toHaveBeenCalledTimes(1);
			expect(api.remaining).toBe(0);
			api.resume();
			expect(api.isActive).toBe(false);
			vi.advanceTimersByTime(2000);
			expect(onComplete).toHaveBeenCalledTimes(1);
		} finally {
			await dispose();
		}
	});

	it('pauses, resumes, resets, and stops', async () => {
		vi.useFakeTimers();
		const { api, dispose } = await mountUtil(() => useCountdown(5));
		try {
			api.start();
			vi.advanceTimersByTime(2000);
			expect(api.remaining).toBe(3);
			api.pause();
			vi.advanceTimersByTime(5000);
			expect(api.remaining).toBe(3);
			api.resume();
			vi.advanceTimersByTime(1000);
			expect(api.remaining).toBe(2);
			api.reset();
			expect(api.remaining).toBe(5);
			api.reset(10);
			expect(api.remaining).toBe(10);
			api.stop();
			expect(api.isActive).toBe(false);
			expect(api.remaining).toBe(5);
		} finally {
			await dispose();
		}
	});

	it('start overrides the countdown value', async () => {
		vi.useFakeTimers();
		const { api, dispose } = await mountUtil(() => useCountdown(5));
		try {
			api.start(2);
			expect(api.remaining).toBe(2);
			vi.advanceTimersByTime(2000);
			expect(api.remaining).toBe(0);
			expect(api.isActive).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('writes through the remaining setter and resumes from it', async () => {
		vi.useFakeTimers();
		const { api, dispose } = await mountUtil(() => useCountdown(5));
		try {
			api.remaining = 1;
			expect(api.remaining).toBe(1);
			// Unlike start(), resume() does not reset — it ticks from the set value.
			api.resume();
			vi.advanceTimersByTime(1000);
			expect(api.remaining).toBe(0);
			expect(api.isActive).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('delegates ticking to a custom scheduler', async () => {
		const pause = vi.fn();
		const resume = vi.fn();
		let active = false;
		let fire: (() => void) | undefined;
		const { api, dispose } = await mountUtil(() =>
			useCountdown(3, {
				scheduler: (cb) => {
					fire = cb;
					return {
						get isActive() {
							return active;
						},
						pause: () => {
							active = false;
							pause();
						},
						resume: () => {
							active = true;
							resume();
						}
					};
				}
			})
		);
		try {
			expect(api.isActive).toBe(false);
			api.start();
			expect(resume).toHaveBeenCalledTimes(1);
			expect(api.isActive).toBe(true);
			// Drive the countdown without any real timer in play.
			fire?.();
			expect(api.remaining).toBe(2);
			api.stop();
			expect(pause).toHaveBeenCalledTimes(1);
			expect(api.isActive).toBe(false);
			expect(api.remaining).toBe(3);
		} finally {
			await dispose();
		}
	});

	it('pauses the scheduler when the custom source reaches zero', async () => {
		const onComplete = vi.fn();
		let active = false;
		let fire: (() => void) | undefined;
		const { api, dispose } = await mountUtil(() =>
			useCountdown(1, {
				onComplete,
				scheduler: (cb) => {
					fire = cb;
					return {
						get isActive() {
							return active;
						},
						pause: () => {
							active = false;
						},
						resume: () => {
							active = true;
						}
					};
				}
			})
		);
		try {
			api.start();
			fire?.();
			expect(api.remaining).toBe(0);
			expect(api.isActive).toBe(false);
			expect(onComplete).toHaveBeenCalledTimes(1);
		} finally {
			await dispose();
		}
	});

	it('re-resolves a getter on reset', async () => {
		vi.useFakeTimers();
		const { api, dispose } = await mountUtil(() => useCountdown(() => 5));
		try {
			api.start(4);
			expect(api.remaining).toBe(4);
			api.stop();
			expect(api.remaining).toBe(5);
		} finally {
			await dispose();
		}
	});

	it('stops ticking on unmount', async () => {
		vi.useFakeTimers();
		const onTick = vi.fn();
		const onComplete = vi.fn();
		const { api, dispose } = await mountUtil(() => useCountdown(5, { onComplete, onTick }));
		try {
			api.start();
			vi.advanceTimersByTime(2000);
			expect(onTick).toHaveBeenCalledTimes(2);
			await dispose();
			vi.advanceTimersByTime(5000);
			expect(onTick).toHaveBeenCalledTimes(2);
			expect(onComplete).not.toHaveBeenCalled();
		} finally {
			await dispose();
		}
	});
});
