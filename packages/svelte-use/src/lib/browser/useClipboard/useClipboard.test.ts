// @vitest-environment jsdom
import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

import { mountUtil } from '../../../../test/fixtures/mount.ts';
import type { UseClipboardOptions } from './index.ts';
import { useClipboard } from './index.ts';

function mockClipboard() {
	const writeText = vi.fn(async (_value: string) => {});
	Object.defineProperty(window.navigator, 'clipboard', {
		configurable: true,
		value: { writeText }
	});
	return writeText;
}

const mountClipboard = (opts?: UseClipboardOptions) => mountUtil(() => useClipboard(opts));

describe('useClipboard', () => {
	it('copies text and resets the flag after the window', async () => {
		vi.useFakeTimers();
		const writeText = mockClipboard();
		const { api, dispose } = await mountClipboard({ copiedDuring: 1000 });
		try {
			expect(api.isSupported).toBe(true);
			await api.copy('hello');
			expect(writeText).toHaveBeenCalledWith('hello');
			expect(api.text).toBe('hello');
			expect(api.copied).toBe(true);
			vi.advanceTimersByTime(999);
			expect(api.copied).toBe(true);
			vi.advanceTimersByTime(1);
			expect(api.copied).toBe(false);
		} finally {
			vi.useRealTimers();
			await dispose();
		}
	});

	it('re-arms the reset window on repeat copies', async () => {
		vi.useFakeTimers();
		mockClipboard();
		const { api, dispose } = await mountClipboard({ copiedDuring: 1000 });
		try {
			await api.copy('one');
			vi.advanceTimersByTime(800);
			await api.copy('two');
			expect(api.text).toBe('two');
			vi.advanceTimersByTime(800);
			expect(api.copied).toBe(true);
			vi.advanceTimersByTime(200);
			expect(api.copied).toBe(false);
		} finally {
			vi.useRealTimers();
			await dispose();
		}
	});

	it('is a safe no-op when the Clipboard API is missing', async () => {
		Object.defineProperty(window.navigator, 'clipboard', {
			configurable: true,
			value: undefined
		});
		const { api, dispose } = await mountClipboard();
		try {
			expect(api.isSupported).toBe(false);
			await api.copy('hello');
			expect(api.text).toBe('');
			expect(api.copied).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('surfaces a denied write instead of swallowing it', async () => {
		mockClipboard();
		Object.defineProperty(window.navigator, 'clipboard', {
			configurable: true,
			value: {
				writeText: vi.fn(() => Promise.reject(new Error('denied')))
			}
		});
		const { api, dispose } = await mountClipboard();
		try {
			await expect(api.copy('nope')).rejects.toThrow('denied');
			expect(api.copied).toBe(false);
			expect(api.text).toBe('');
		} finally {
			await dispose();
		}
	});

	it('disposes a pending reset timer on unmount', async () => {
		vi.useFakeTimers();
		mockClipboard();
		const { api, dispose } = await mountClipboard({ copiedDuring: 1000 });
		await api.copy('hello');
		expect(api.copied).toBe(true);
		await dispose();
		vi.advanceTimersByTime(5000);
		vi.useRealTimers();
		// The reset never fired: no stale write to dead state.
		expect(api.copied).toBe(true);
	});

	it('drops an in-flight copy that resolves after unmount', async () => {
		let resolveWrite: (() => void) | undefined;
		Object.defineProperty(window.navigator, 'clipboard', {
			configurable: true,
			value: {
				writeText: vi.fn(
					() =>
						new Promise<void>((resolve) => {
							resolveWrite = resolve;
						})
				)
			}
		});
		const { api, dispose } = await mountClipboard();
		const pending = api.copy('late');
		await dispose();
		resolveWrite?.();
		await pending;
		await tick();
		expect(api.copied).toBe(false);
		expect(api.text).toBe('');
	});
});
