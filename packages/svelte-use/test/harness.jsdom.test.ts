// @vitest-environment jsdom
/**
 * Harness smoke test (jsdom environment): proves DOM globals, the shared
 * `matchMedia` stub, and the mount/unmount `$effect` testing pattern.
 */
import { mount, tick, unmount } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

import Fixture from './fixtures/effect-fixture.svelte';
import { setMediaMatches } from './setup.ts';

describe('test harness (jsdom)', () => {
	it('provides DOM globals', () => {
		expect(typeof window).not.toBe('undefined');
		expect(typeof document).not.toBe('undefined');
		expect(document.createElement('div')).toBeInstanceOf(HTMLElement);
	});

	it('stubs matchMedia with controllable matches', () => {
		const query = '(prefers-color-scheme: dark)';
		const mql = window.matchMedia(query);
		expect(mql.media).toBe(query);
		expect(mql.matches).toBe(false);
		setMediaMatches(query, true);
		expect(window.matchMedia(query).matches).toBe(true);
	});

	it('mounts components and runs effect cleanup on unmount', async () => {
		const onSetup = vi.fn();
		const onCleanup = vi.fn();
		const target = document.createElement('div');
		document.body.appendChild(target);
		try {
			const app = mount(Fixture, { props: { onCleanup, onSetup }, target });
			await tick();
			expect(onSetup).toHaveBeenCalledTimes(1);
			unmount(app);
			await tick();
			expect(onCleanup).toHaveBeenCalledTimes(1);
		} finally {
			target.remove();
		}
	});
});
