// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

import { createSharedComposable } from './index.ts';

describe('createSharedComposable', () => {
	it('returns the same instance across calls', () => {
		const factory = vi.fn(() => ({ id: 1 }));
		const shared = createSharedComposable(factory);

		expect(shared()).toBe(shared());
		expect(factory).toHaveBeenCalledTimes(1);
	});

	it('forwards arguments to the first call only', () => {
		const factory = vi.fn((n: number) => ({ n }));
		const shared = createSharedComposable(factory);

		expect(shared(1)).toBe(shared(2));
		expect(factory).toHaveBeenCalledTimes(1);
		expect(factory.mock.calls[0]?.[0]).toBe(1);
	});

	it('invokes an undefined-returning composable once', () => {
		const factory = vi.fn(() => undefined);
		const shared = createSharedComposable(factory);

		expect(shared()).toBeUndefined();
		expect(shared()).toBeUndefined();
		expect(factory).toHaveBeenCalledTimes(1);
	});

	it('keeps separate factories separate', () => {
		const sharedA = createSharedComposable(() => ({ id: 'a' }));
		const sharedB = createSharedComposable(() => ({ id: 'b' }));

		expect(sharedA()).not.toBe(sharedB());
	});
});
