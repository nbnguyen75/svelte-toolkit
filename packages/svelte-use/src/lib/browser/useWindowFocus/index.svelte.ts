import { isBrowser } from '../../shared/is.ts';
import { useEventListener } from '../useEventListener/index.ts';

/** Reactive window focus state returned by {@link useWindowFocus}. */
export interface UseWindowFocusReturn {
	/** Whether the window has focus. */
	readonly focused: boolean;
}

/**
 * Reactive window focus state, from `focus` and `blur`.
 *
 * Must be called in component initialization (uses `$state`).
 *
 * @returns Getter-backed `focused`.
 * @example
 * ```ts
 * const { focused } = useWindowFocus();
 * ```
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useWindowFocus } from '@wynn-dev/svelte-use';
 *
 *   const { focused } = useWindowFocus();
 * </script>
 *
 * <p>{focused ? 'Editing' : 'Away'}</p>
 * ```
 */
export function useWindowFocus(): UseWindowFocusReturn {
	let focused = $state(isBrowser && document.hasFocus());

	useEventListener(
		() => window,
		'blur',
		() => {
			focused = false;
		},
		{ passive: true }
	);

	useEventListener(
		() => window,
		'focus',
		() => {
			focused = true;
		},
		{ passive: true }
	);

	return {
		get focused() {
			return focused;
		}
	};
}
