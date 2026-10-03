// @vitest-environment jsdom
/**
 * `MediaQuery` subscribes lazily, so every assertion reads the util *inside*
 * an effect via `mountReactive` — reading in the test body would pass even if
 * reactivity were broken.
 */
import { tick } from 'svelte';
import { describe, expect, it } from 'vitest';

import { mountReactive } from '../../../../test/fixtures/mount.ts';
import { mediaListenerCount, setMediaMatches } from '../../../../test/setup.ts';
import type { UseBreakpointsOptions, UseBreakpointsReturn } from './index.ts';
import { breakpointsTailwind, useBreakpoints } from './index.ts';

const BP = { sm: 640, md: 768, lg: 1024 };
type Key = 'sm' | 'md' | 'lg';

interface Snapshot {
	active: string;
	exactlyMd: boolean;
	inRange: boolean;
	inclusiveSm: boolean;
	md: boolean;
	mobileOnly: boolean;
	strictlyLg: boolean;
	strictlySm: boolean;
	upToLg: boolean;
}

/** Mount, then read every helper inside an effect on each run. */
async function snapshot(opts?: UseBreakpointsOptions) {
	const state: Snapshot = {
		active: '',
		exactlyMd: false,
		inRange: false,
		inclusiveSm: false,
		md: false,
		mobileOnly: false,
		strictlyLg: false,
		strictlySm: false,
		upToLg: false
	};
	const { dispose } = await mountReactive(
		() => useBreakpoints<Key>(BP, opts),
		(api: UseBreakpointsReturn<Key>) => {
			state.md = api.md;
			state.active = api.active();
			state.exactlyMd = api.greaterOrEqual('md') && api.smallerOrEqual('md');
			state.inRange = api.between('sm', 'lg');
			state.inclusiveSm = api.greaterOrEqual('sm') && api.smallerOrEqual('sm');
			state.mobileOnly = api.greater('sm');
			state.strictlyLg = api.greater('lg');
			state.strictlySm = api.smaller('sm');
			state.upToLg = api.smallerOrEqual('lg');
		}
	);
	return { state, dispose };
}

describe('useBreakpoints (min-width)', () => {
	it('reports the mobile shorthand as false below every breakpoint', async () => {
		const { state, dispose } = await snapshot();
		try {
			expect(state.md).toBe(false);
			expect(state.active).toBe('');
			expect(state.exactlyMd).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('re-evaluates the shorthand when the viewport crosses a breakpoint', async () => {
		const { state, dispose } = await snapshot();
		try {
			setMediaMatches('(min-width: 768px)', true);
			await tick();
			expect(state.md).toBe(true);

			setMediaMatches('(min-width: 768px)', false);
			await tick();
			expect(state.md).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('reports the largest match as active', async () => {
		setMediaMatches('(min-width: 640px)', true);
		setMediaMatches('(min-width: 768px)', true);
		setMediaMatches('(min-width: 1024px)', true);
		const { state, dispose } = await snapshot();
		try {
			expect(state.active).toBe('lg');
		} finally {
			await dispose();
		}
	});

	it('treats the breakpoint itself as inclusive, not strict', async () => {
		setMediaMatches('(min-width: 768px)', true);
		setMediaMatches('(max-width: 768px)', true);
		const { state, dispose } = await snapshot();
		try {
			expect(state.exactlyMd).toBe(true);
			expect(state.strictlyLg).toBe(false);
			expect(state.strictlySm).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('keeps the strict comparisons false while sitting exactly on the bound', async () => {
		setMediaMatches('(min-width: 640px)', true);
		setMediaMatches('(max-width: 640px)', true);
		const { state, dispose } = await snapshot();
		try {
			expect(state.inclusiveSm).toBe(true);
			expect(state.mobileOnly).toBe(false);
			expect(state.strictlySm).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('flips both strict comparisons one epsilon past the bound', async () => {
		setMediaMatches('(min-width: 640.1px)', true);
		setMediaMatches('(max-width: 639.9px)', true);
		const { state, dispose } = await snapshot();
		try {
			expect(state.mobileOnly).toBe(true);
			expect(state.strictlySm).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('matches greater only strictly above the breakpoint', async () => {
		setMediaMatches('(min-width: 1024.1px)', true);
		const { state, dispose } = await snapshot();
		try {
			expect(state.strictlyLg).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('matches smaller only strictly below the breakpoint', async () => {
		setMediaMatches('(max-width: 639.9px)', true);
		const { state, dispose } = await snapshot();
		try {
			expect(state.strictlySm).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('matches smallerOrEqual at the breakpoint itself', async () => {
		setMediaMatches('(max-width: 1024px)', true);
		const { state, dispose } = await snapshot();
		try {
			expect(state.upToLg).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('treats between as inclusive below and exclusive above', async () => {
		setMediaMatches('(min-width: 640px) and (max-width: 1023.9px)', true);
		const { state, dispose } = await snapshot();
		try {
			expect(state.inRange).toBe(true);
		} finally {
			await dispose();
		}
	});
});

describe('useBreakpoints (max-width)', () => {
	it('inverts the shorthand to a desktop-first query', async () => {
		setMediaMatches('(max-width: 768px)', true);
		const { state, dispose } = await snapshot({ strategy: 'max-width' });
		try {
			expect(state.md).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('reports the smallest match as active', async () => {
		setMediaMatches('(max-width: 640px)', true);
		setMediaMatches('(max-width: 768px)', true);
		setMediaMatches('(max-width: 1024px)', true);
		const { state, dispose } = await snapshot({ strategy: 'max-width' });
		try {
			expect(state.active).toBe('sm');
		} finally {
			await dispose();
		}
	});
});

describe('useBreakpoints (current)', () => {
	it('lists every match in ascending width order', async () => {
		setMediaMatches('(min-width: 640px)', true);
		setMediaMatches('(min-width: 768px)', true);
		let current: string[] = [];
		const { dispose } = await mountReactive(
			() => useBreakpoints<Key>(BP),
			(api: UseBreakpointsReturn<Key>) => {
				current = api.current();
			}
		);
		try {
			expect(current).toEqual(['sm', 'md']);
		} finally {
			await dispose();
		}
	});
});

describe('useBreakpoints (values)', () => {
	it('keeps a unit-bearing string in the query', async () => {
		let matched = false;
		const { dispose } = await mountReactive(
			() => useBreakpoints({ md: '48rem' }),
			(api) => {
				matched = api.greaterOrEqual('md');
			}
		);
		try {
			setMediaMatches('(min-width: 48rem)', true);
			await tick();
			expect(matched).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('sorts rem keys against px keys by resolved width', async () => {
		setMediaMatches('(min-width: 768px)', true);
		let active = '';
		const { dispose } = await mountReactive(
			() => useBreakpoints({ wide: '60rem', md: 768 }),
			(api) => {
				active = api.active();
			}
		);
		try {
			// 60rem resolves to 960px, so `md` is the largest match at 768px.
			expect(active).toBe('md');
		} finally {
			await dispose();
		}
	});

	it('falls back to 0px for an unknown key instead of building a broken query', () => {
		const api = useBreakpoints<string>(BP);
		expect(() => api.greaterOrEqual('nope')).not.toThrow();
		expect(api.greaterOrEqual('nope')).toBe(false);
	});

	it('accepts a getter for the breakpoint key', async () => {
		let matched = false;
		const { dispose } = await mountReactive(
			() => useBreakpoints<Key>(BP),
			(api: UseBreakpointsReturn<Key>) => {
				matched = api.greaterOrEqual(() => 'lg');
			}
		);
		try {
			setMediaMatches('(min-width: 1024px)', true);
			await tick();
			expect(matched).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('exposes the shipped Tailwind scale', () => {
		expect(breakpointsTailwind.sm).toBe(640);
		expect(breakpointsTailwind.md).toBe(768);
		expect(breakpointsTailwind['2xl']).toBe(1536);
	});
});

describe('useBreakpoints (listener lifetime)', () => {
	it('releases every media listener on unmount', async () => {
		const { dispose } = await mountReactive(
			() => useBreakpoints<Key>(BP),
			(api: UseBreakpointsReturn<Key>) => {
				// Touch several distinct queries so several listeners exist.
				api.md;
				api.smaller('lg');
				api.greater('sm');
				api.between('sm', 'lg');
				api.active();
			}
		);

		expect(mediaListenerCount()).toBeGreaterThan(0);
		await dispose();
		expect(mediaListenerCount()).toBe(0);
	});
});
