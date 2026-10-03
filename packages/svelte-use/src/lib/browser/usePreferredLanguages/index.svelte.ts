import { isBrowser } from '../../shared/is.ts';
import { useEventListener } from '../useEventListener/index.svelte.ts';

/** Reactive result of {@link usePreferredLanguages}. */
export interface UsePreferredLanguagesReturn {
	/**
	 * `navigator.languages`, updated on `languagechange`. Getter-backed, so
	 * destructuring stays reactive. Falls back to `['en']` during SSR.
	 */
	readonly value: readonly string[];
}

/**
 * VueUse hardcodes `['en']` as the server value. Kept as a module constant
 * rather than a per-call option: it is only ever read on the server, so an
 * option would be config for a value that cannot change.
 */
const SSR_FALLBACK: readonly string[] = ['en'];

/**
 * Reactive `navigator.languages`, refreshed on `languagechange`.
 *
 * The listener is attached through {@link useEventListener}, so it is removed
 * on unmount. On the server `value` is `['en']` and nothing is attached.
 *
 * @returns Getter-backed `value`.
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { usePreferredLanguages } from '@wynn-dev/svelte-use';
 *
 *   const languages = usePreferredLanguages();
 * </script>
 *
 * <p>primary: {languages.value[0]}</p>
 * ```
 */
export function usePreferredLanguages(): UsePreferredLanguagesReturn {
	let value = $state<readonly string[]>(isBrowser ? window.navigator.languages : SSR_FALLBACK);

	useEventListener(
		() => (isBrowser ? window : null),
		'languagechange',
		() => {
			value = window.navigator.languages;
		},
		{ passive: true }
	);

	return {
		get value() {
			return value;
		}
	};
}
