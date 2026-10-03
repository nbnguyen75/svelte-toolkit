import { MediaQuery } from 'svelte/reactivity';

import { isBrowser } from '../../shared/is.ts';

const REDUCED_TRANSPARENCY_QUERY = '(prefers-reduced-transparency: reduce)';

/** The user's transparency preference. */
export type UsePreferredReducedTransparencyValue = 'no-preference' | 'reduce';

/** Reactive result of {@link usePreferredReducedTransparency}. */
export interface UsePreferredReducedTransparencyReturn {
	/**
	 * `'reduce'` while the OS asks for reduced transparency, otherwise
	 * `'no-preference'`. Getter-backed, so destructuring stays reactive.
	 * Always `'no-preference'` during SSR.
	 */
	readonly value: UsePreferredReducedTransparencyValue;
}

/**
 * Reactive `prefers-reduced-transparency` media query.
 *
 * `MediaQuery` is built inside the factory so no instance is shared across
 * callers or server requests (scope.md §2). Its constructor touches
 * `window.matchMedia`, so it is skipped entirely on the server and `value`
 * reads `'no-preference'` there.
 *
 * @returns Getter-backed `value` of `'reduce'` or `'no-preference'`.
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { usePreferredReducedTransparency } from '@wynn-dev/svelte-use';
 *
 *   const transparency = usePreferredReducedTransparency();
 * </script>
 *
 * <div class:reduced={transparency.value === 'reduce'}>…</div>
 * ```
 */
export function usePreferredReducedTransparency(): UsePreferredReducedTransparencyReturn {
	const query = isBrowser ? new MediaQuery(REDUCED_TRANSPARENCY_QUERY) : null;

	return {
		get value(): UsePreferredReducedTransparencyValue {
			return query?.current === true ? 'reduce' : 'no-preference';
		}
	};
}
