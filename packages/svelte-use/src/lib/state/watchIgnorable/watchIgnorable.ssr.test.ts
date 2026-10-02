/**
 * SSR probe (node environment, no DOM): under the node environment `svelte`
 * resolves to its server build, where runes are inert. `$effect` never runs, so
 * `watchIgnorable` must construct a usable handle without invoking the callback.
 */
import { describe, expect, it, vi } from 'vitest';

import { watchIgnorable } from './index.ts';

describe('watchIgnorable (ssr)', () => {
	it('constructs without running the callback', () => {
		const spy = vi.fn();
		const watch = watchIgnorable(
			() => 1,
			(value) => spy(value),
			{ immediate: true }
		);

		expect(spy).not.toHaveBeenCalled();
		expect(typeof watch.ignoreUpdates).toBe('function');
		expect(typeof watch.ignorePrevAsyncUpdates).toBe('function');
		expect(typeof watch.stop).toBe('function');
	});

	it('runs the updater synchronously and returns its value', () => {
		const watch = watchIgnorable(
			() => 1,
			() => {}
		);
		let value = 0;
		const result = watch.ignoreUpdates(() => {
			value = 5;
			return value * 2;
		});

		expect(result).toBe(10);
		watch.stop();
	});
});
