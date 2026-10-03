// @vitest-environment jsdom
/** `MediaQuery` subscribes lazily, so the read happens inside an effect. */
import { tick } from 'svelte';
import { describe, expect, it } from 'vitest';

import { mountReactive } from '../../../../test/fixtures/mount.ts';
import { mediaListenerCount, setMediaMatches } from '../../../../test/setup.ts';
import type { UsePreferredReducedTransparencyValue } from './index.ts';
import { usePreferredReducedTransparency } from './index.ts';

const QUERY = '(prefers-reduced-transparency: reduce)';

async function mountTransparency() {
	const state = { value: 'no-preference' as UsePreferredReducedTransparencyValue };
	const { dispose } = await mountReactive(
		() => usePreferredReducedTransparency(),
		(api) => {
			state.value = api.value;
		}
	);
	return { state, dispose };
}

describe('usePreferredReducedTransparency', () => {
	it('defaults to no-preference when the OS does not ask for reduced transparency', async () => {
		const { state, dispose } = await mountTransparency();
		try {
			expect(state.value).toBe('no-preference');
		} finally {
			await dispose();
		}
	});

	it('reports reduce when the OS asks for reduced transparency', async () => {
		setMediaMatches(QUERY, true);
		const { state, dispose } = await mountTransparency();
		try {
			expect(state.value).toBe('reduce');
		} finally {
			await dispose();
		}
	});

	it('follows the OS preference changing at runtime', async () => {
		const { state, dispose } = await mountTransparency();
		try {
			expect(state.value).toBe('no-preference');

			setMediaMatches(QUERY, true);
			await tick();
			expect(state.value).toBe('reduce');

			setMediaMatches(QUERY, false);
			await tick();
			expect(state.value).toBe('no-preference');
		} finally {
			await dispose();
		}
	});

	it('releases its media subscription on unmount', async () => {
		setMediaMatches(QUERY, true);
		const { dispose } = await mountTransparency();
		expect(mediaListenerCount()).toBe(1);

		await dispose();
		expect(mediaListenerCount()).toBe(0);
	});

	it('gives each caller its own media query', async () => {
		const first = await mountTransparency();
		const second = await mountTransparency();
		try {
			setMediaMatches(QUERY, true);
			await tick();
			expect(first.state.value).toBe('reduce');
			expect(second.state.value).toBe('reduce');
		} finally {
			await first.dispose();
			await second.dispose();
		}
	});
});
