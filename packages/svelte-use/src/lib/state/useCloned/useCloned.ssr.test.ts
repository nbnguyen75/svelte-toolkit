/**
 * SSR probe (node environment, no DOM): under the node environment `svelte`
 * resolves to its server build, where runes are inert — which is exactly real
 * SSR. `useCloned` must still clone the source without a DOM; `$effect` never
 * runs, so `isModified` stays false.
 */
import { describe, expect, it } from 'vitest';

import { useCloned } from './index.ts';

describe('useCloned (ssr)', () => {
	it('clones a plain source without a DOM', () => {
		const source = { a: 1 };
		const cloned = useCloned(source);

		expect(cloned.value).toEqual({ a: 1 });
		expect(cloned.value).not.toBe(source);
		expect(cloned.isModified).toBe(false);
	});

	it('honours a custom clone without a DOM', () => {
		const cloned = useCloned({ a: 1 }, { clone: (source) => ({ a: source.a + 1 }) });

		expect(cloned.value).toEqual({ a: 2 });
		expect(() => cloned.sync()).not.toThrow();
	});
});
