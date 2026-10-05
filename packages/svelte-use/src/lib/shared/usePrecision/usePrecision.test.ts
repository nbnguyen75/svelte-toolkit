// @vitest-environment jsdom
/**
 * `usePrecision` owns reactive state (a `$derived`), so it is created at init
 * and read from a separate effect — the real usage shape.
 */
import { describe, expect, it } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountInitialized } from '../../../../test/fixtures/mount.ts';
import type { UsePrecisionReturn } from './index.ts';
import { usePrecision } from './index.ts';

describe('usePrecision', () => {
	it('rounds to the requested digits', async () => {
		const { api, dispose } = await mountInitialized(
			() => usePrecision(45.125, 2),
			() => {}
		);
		const result: UsePrecisionReturn = api;

		expect(result.value).toBe(45.13);
		await dispose();
	});

	it('rounds through the integer domain, not the float error', async () => {
		// `45.125 * 100` is `4512.4999…`, so a naive
		// `Math.round(value * power) / power` answers 45.12. This is the case the
		// util exists for.
		const value = createBox(45.125);
		const { api, dispose } = await mountInitialized(
			() => usePrecision(() => value.value, 2),
			() => {}
		);

		expect(api.value).toBe(45.13);
		await dispose();
	});

	it('follows a changing value', async () => {
		const value = createBox(45.125);
		const { api, dispose } = await mountInitialized(
			() => usePrecision(() => value.value, 2),
			() => {}
		);

		expect(api.value).toBe(45.13);
		value.value = -45.155;
		expect(api.value).toBe(-45.15);
		await dispose();
	});

	it('follows changing digits', async () => {
		const digits = createBox(2);
		const { api, dispose } = await mountInitialized(
			() => usePrecision(45.129, () => digits.value),
			() => {}
		);

		expect(api.value).toBe(45.13);
		digits.value = 1;
		expect(api.value).toBe(45.1);
		await dispose();
	});

	it('defaults to round', async () => {
		const { api, dispose } = await mountInitialized(
			() => usePrecision(45.125, 2, {}),
			() => {}
		);

		expect(api.value).toBe(45.13);
		await dispose();
	});

	it('rounds up with ceil', async () => {
		const value = createBox(45.125);
		const { api, dispose } = await mountInitialized(
			() => usePrecision(() => value.value, 2, { math: 'ceil' }),
			() => {}
		);

		expect(api.value).toBe(45.13);
		value.value = -45.151;
		expect(api.value).toBe(-45.15);
		await dispose();
	});

	it('rounds down with floor', async () => {
		const value = createBox(45.129);
		const { api, dispose } = await mountInitialized(
			() => usePrecision(() => value.value, 2, { math: 'floor' }),
			() => {}
		);

		expect(api.value).toBe(45.12);
		value.value = -45.159;
		expect(api.value).toBe(-45.16);
		value.value = 2.3;
		expect(api.value).toBe(2.3);
		value.value = -2.3;
		expect(api.value).toBe(-2.3);
		await dispose();
	});

	it('reads the method from a getter', async () => {
		const method = createBox<'floor' | 'ceil' | 'round'>('floor');
		const { api, dispose } = await mountInitialized(
			() => usePrecision(45.129, 2, () => ({ math: method.value })),
			() => {}
		);

		expect(api.value).toBe(45.12);
		method.value = 'ceil';
		expect(api.value).toBe(45.13);
		await dispose();
	});

	it('leaves integers and zero alone', async () => {
		const { api, dispose } = await mountInitialized(
			() => usePrecision(42, 2),
			() => {}
		);

		expect(api.value).toBe(42);
		await dispose();
	});
});
