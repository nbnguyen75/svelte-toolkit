import { afterEach, describe, expect, it, vi } from 'vitest';

import { useDebounceFn } from './index.ts';

afterEach(() => {
	vi.useRealTimers();
});

describe('useDebounceFn', () => {
	it('invokes once with the latest args after the delay (trailing default)', () => {
		vi.useFakeTimers();
		const spy = vi.fn();
		const debounced = useDebounceFn(spy, 200);
		debounced('a');
		debounced('b');
		debounced('c');
		expect(spy).not.toHaveBeenCalled();
		vi.advanceTimersByTime(199);
		expect(spy).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith('c');
	});

	it('uses default delay and options when omitted', () => {
		vi.useFakeTimers();
		const spy = vi.fn();
		const debounced = useDebounceFn(spy);
		debounced();
		vi.advanceTimersByTime(199);
		expect(spy).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(spy).toHaveBeenCalledTimes(1);
	});

	it('restarts the quiet window on every call', () => {
		vi.useFakeTimers();
		const spy = vi.fn();
		const debounced = useDebounceFn(spy, 200);
		debounced();
		vi.advanceTimersByTime(150);
		debounced();
		vi.advanceTimersByTime(150);
		expect(spy).not.toHaveBeenCalled();
		vi.advanceTimersByTime(50);
		expect(spy).toHaveBeenCalledTimes(1);
	});

	it('forwards every argument, not just the first', () => {
		vi.useFakeTimers();
		const spy = vi.fn();
		const debounced = useDebounceFn(spy, 100);
		debounced(1, 'two', { three: true });
		vi.advanceTimersByTime(100);
		expect(spy).toHaveBeenCalledWith(1, 'two', { three: true });
	});

	it('invokes on the leading edge and then trailing for the rest', () => {
		vi.useFakeTimers();
		const spy = vi.fn();
		const debounced = useDebounceFn(spy, 200, { leading: true });
		debounced('first');
		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith('first');
		debounced('second');
		expect(spy).toHaveBeenCalledTimes(1);
		vi.advanceTimersByTime(200);
		expect(spy).toHaveBeenCalledTimes(2);
		expect(spy).toHaveBeenLastCalledWith('second');
	});

	it('with leading and trailing:false invokes once per burst', () => {
		vi.useFakeTimers();
		const spy = vi.fn();
		const debounced = useDebounceFn(spy, 200, { leading: true, trailing: false });
		debounced('a');
		debounced('b');
		debounced('c');
		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith('a');
		vi.advanceTimersByTime(200);
		expect(spy).toHaveBeenCalledTimes(1);
		// New burst after quiet starts with a fresh leading edge.
		debounced('d');
		expect(spy).toHaveBeenCalledTimes(2);
		expect(spy).toHaveBeenLastCalledWith('d');
	});

	it('forces invocation at maxWait during a sustained burst', () => {
		vi.useFakeTimers();
		const spy = vi.fn();
		const debounced = useDebounceFn(spy, 1000, { maxWait: 1500 });
		debounced('a');
		vi.advanceTimersByTime(500);
		debounced('b');
		vi.advanceTimersByTime(500);
		debounced('c');
		vi.advanceTimersByTime(500);
		// maxWait (1500ms after burst start) fires with the latest args,
		// even though the burst never went quiet for a full delay.
		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith('c');
		expect(debounced.pending()).toBe(false);
		// The burst's regular timer was consumed: staying quiet adds nothing.
		vi.advanceTimersByTime(2000);
		expect(spy).toHaveBeenCalledTimes(1);
		// The wrapper stays reusable after a maxWait burst.
		debounced('d');
		vi.advanceTimersByTime(1000);
		expect(spy).toHaveBeenCalledTimes(2);
		expect(spy).toHaveBeenLastCalledWith('d');
	});

	it('invokes synchronously when delay is 0', () => {
		const spy = vi.fn();
		const debounced = useDebounceFn(spy, 0);
		debounced('now');
		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith('now');
		expect(debounced.pending()).toBe(false);
	});

	it('invokes synchronously when maxWait is 0', () => {
		const spy = vi.fn();
		const debounced = useDebounceFn(spy, 1000, { maxWait: 0 });
		debounced('now');
		expect(spy).toHaveBeenCalledTimes(1);
		expect(debounced.pending()).toBe(false);
	});

	it('cancel drops the pending invocation and is safe repeated', () => {
		vi.useFakeTimers();
		const spy = vi.fn();
		const debounced = useDebounceFn(spy, 200);
		debounced();
		debounced.cancel();
		debounced.cancel();
		expect(debounced.pending()).toBe(false);
		vi.advanceTimersByTime(500);
		expect(spy).not.toHaveBeenCalled();
		// Cancelled wrapper stays reusable.
		debounced();
		vi.advanceTimersByTime(200);
		expect(spy).toHaveBeenCalledTimes(1);
	});

	it('cancel drops a pending maxWait burst', () => {
		vi.useFakeTimers();
		const spy = vi.fn();
		const debounced = useDebounceFn(spy, 1000, { maxWait: 1500 });
		debounced();
		vi.advanceTimersByTime(500);
		debounced();
		debounced.cancel();
		expect(debounced.pending()).toBe(false);
		vi.advanceTimersByTime(5000);
		expect(spy).not.toHaveBeenCalled();
	});

	it('flush invokes immediately with the latest args and prevents a second call', () => {
		vi.useFakeTimers();
		const spy = vi.fn();
		const debounced = useDebounceFn(spy, 200);
		debounced('a');
		debounced('b');
		debounced.flush();
		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith('b');
		vi.advanceTimersByTime(500);
		expect(spy).toHaveBeenCalledTimes(1);
	});

	it('flush is a no-op when idle or after cancel', () => {
		const idle = vi.fn();
		const idleDebounced = useDebounceFn(idle, 200);
		idleDebounced.flush();
		expect(idle).not.toHaveBeenCalled();

		vi.useFakeTimers();
		const spy = vi.fn();
		const debounced = useDebounceFn(spy, 200);
		debounced();
		debounced.cancel();
		debounced.flush();
		vi.advanceTimersByTime(500);
		expect(spy).not.toHaveBeenCalled();
	});

	it('pending tracks armed timers through invoke, flush, and cancel', () => {
		vi.useFakeTimers();
		const spy = vi.fn();
		const debounced = useDebounceFn(spy, 200);
		expect(debounced.pending()).toBe(false);
		debounced();
		expect(debounced.pending()).toBe(true);
		debounced.flush();
		expect(debounced.pending()).toBe(false);

		debounced();
		expect(debounced.pending()).toBe(true);
		debounced.cancel();
		expect(debounced.pending()).toBe(false);

		debounced();
		vi.advanceTimersByTime(200);
		expect(debounced.pending()).toBe(false);
	});

	it('does not invoke fn after unmount-style disposal', () => {
		// The wrappers are plain closures, so disposal is `cancel()`. Guards
		// against a stray timer writing to a torn-down component.
		vi.useFakeTimers();
		const spy = vi.fn();
		const debounced = useDebounceFn(spy, 200);
		debounced('late');
		debounced.cancel();
		vi.advanceTimersByTime(10_000);
		expect(spy).not.toHaveBeenCalled();
	});
});
