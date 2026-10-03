// @vitest-environment jsdom
import { tick } from 'svelte';
import { describe, expect, it } from 'vitest';

import { mountUtil } from '../../../../test/fixtures/mount.ts';
import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { useCssSupports } from './index.ts';

describe('useCssSupports', () => {
	it('probes a property/value pair', async () => {
		const { api, dispose } = await mountUtil(() => useCssSupports('display', 'grid'));
		try {
			expect(api.isSupported).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('probes a whole condition string', async () => {
		const { api, dispose } = await mountUtil(() => useCssSupports('display: grid'));
		try {
			expect(api.isSupported).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('reports false for a property the engine does not know', async () => {
		const { api, dispose } = await mountUtil(() => useCssSupports('not-a-real-prop', 'nope'));
		try {
			expect(api.isSupported).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('reads reactive inputs through getters', async () => {
		// A plain test-local `let` would prove nothing: Svelte only tracks
		// `$state`, so the getter has to close over a real reactive source.
		const property = createBox('display');
		const { api, dispose } = await mountUtil(() =>
			useCssSupports(
				() => property.value,
				() => 'grid'
			)
		);
		try {
			expect(api.isSupported).toBe(true);
			property.value = 'not-a-real-prop';
			await tick();
			expect(api.isSupported).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('does not confuse an options object for a value', async () => {
		const { api, dispose } = await mountUtil(() =>
			useCssSupports('display: grid', { ssrValue: true })
		);
		try {
			// Treated as the condition form: `ssrValue` never reaches `CSS.supports`.
			expect(api.isSupported).toBe(true);
		} finally {
			await dispose();
		}
	});
});
