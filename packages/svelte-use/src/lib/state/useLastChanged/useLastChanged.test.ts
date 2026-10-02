// @vitest-environment jsdom
import { tick } from 'svelte';
import { describe, expect, it } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountUtil } from '../../../../test/fixtures/mount.ts';
import { useLastChanged } from './index.ts';

describe('useLastChanged', () => {
	it('reports no change before the first update', async () => {
		const box = createBox(1);
		const { api, dispose } = await mountUtil(() => useLastChanged(() => box.value));
		try {
			expect(api.hasChanged).toBe(false);
			expect(api.timestamp).toBe(0);
		} finally {
			await dispose();
		}
	});

	it('stamps on change using the injected timestamp', async () => {
		const box = createBox(1);
		const { api, dispose } = await mountUtil(() =>
			useLastChanged(() => box.value, { timestamp: () => 1234 })
		);
		try {
			expect(api.hasChanged).toBe(false);

			box.value = 2;
			await tick();
			expect(api.hasChanged).toBe(true);
			expect(api.timestamp).toBe(1234);
		} finally {
			await dispose();
		}
	});

	it('stamps immediately when immediate is true', async () => {
		const box = createBox(1);
		const { api, dispose } = await mountUtil(() =>
			useLastChanged(() => box.value, { immediate: true, timestamp: () => 7 })
		);
		try {
			expect(api.hasChanged).toBe(true);
			expect(api.timestamp).toBe(7);
		} finally {
			await dispose();
		}
	});

	it('restamps on every change', async () => {
		const box = createBox(1);
		let stamp = 0;
		const { api, dispose } = await mountUtil(() =>
			useLastChanged(() => box.value, { timestamp: () => ++stamp })
		);
		try {
			box.value = 2;
			await tick();
			expect(api.timestamp).toBe(1);

			box.value = 3;
			await tick();
			expect(api.timestamp).toBe(2);
		} finally {
			await dispose();
		}
	});

	it('accepts a getter source', async () => {
		const box = createBox('a');
		const { api, dispose } = await mountUtil(() =>
			useLastChanged(() => box.value, { timestamp: () => 9 })
		);
		try {
			box.value = 'b';
			await tick();
			expect(api.timestamp).toBe(9);
		} finally {
			await dispose();
		}
	});

	it('keeps instances independent', async () => {
		const a = createBox(1);
		const b = createBox(1);
		const first = await mountUtil(() => useLastChanged(() => a.value, { timestamp: () => 1 }));
		const second = await mountUtil(() => useLastChanged(() => b.value, { timestamp: () => 2 }));
		try {
			a.value = 2;
			await tick();
			expect(first.api.hasChanged).toBe(true);
			expect(second.api.hasChanged).toBe(false);
		} finally {
			await first.dispose();
			await second.dispose();
		}
	});
});
