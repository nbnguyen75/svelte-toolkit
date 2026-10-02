// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mountUtil } from '../../../../test/fixtures/mount.ts';
import { refAutoReset } from './index.ts';

describe('refAutoReset', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('starts at the default value', async () => {
		const { api, dispose } = await mountUtil(() => refAutoReset('idle', 2000));
		try {
			expect(api.value).toBe('idle');
		} finally {
			await dispose();
		}
	});

	it('resets to the default after the quiet period', async () => {
		const { api, dispose } = await mountUtil(() => refAutoReset('idle', 2000));
		try {
			api.value = 'saved';
			expect(api.value).toBe('saved');
			vi.advanceTimersByTime(1999);
			expect(api.value).toBe('saved');
			vi.advanceTimersByTime(1);
			expect(api.value).toBe('idle');
		} finally {
			await dispose();
		}
	});

	it('re-arms the timer on each write', async () => {
		const { api, dispose } = await mountUtil(() => refAutoReset('idle', 2000));
		try {
			api.value = 'a';
			vi.advanceTimersByTime(1500);
			api.value = 'b';
			vi.advanceTimersByTime(1500);
			expect(api.value).toBe('b');
			vi.advanceTimersByTime(500);
			expect(api.value).toBe('idle');
		} finally {
			await dispose();
		}
	});

	it('re-resolves a getter default on each reset', async () => {
		let fallback = 'one';
		const { api, dispose } = await mountUtil(() => refAutoReset(() => fallback, 1000));
		try {
			api.value = 'changed';
			fallback = 'two';
			vi.advanceTimersByTime(1000);
			expect(api.value).toBe('two');
		} finally {
			await dispose();
		}
	});

	it('re-resolves a getter delay on each write', async () => {
		let wait = 1000;
		const { api, dispose } = await mountUtil(() => refAutoReset('idle', () => wait));
		try {
			api.value = 'a';
			wait = 2000;
			api.value = 'b';
			vi.advanceTimersByTime(1000);
			expect(api.value).toBe('b');
			vi.advanceTimersByTime(1000);
			expect(api.value).toBe('idle');
		} finally {
			await dispose();
		}
	});

	it('clears the pending timer when the owner unmounts', async () => {
		const { api, dispose } = await mountUtil(() => refAutoReset('idle', 1000));
		api.value = 'saved';
		await dispose();
		vi.advanceTimersByTime(5000);
		expect(api.value).toBe('saved');
	});
});
