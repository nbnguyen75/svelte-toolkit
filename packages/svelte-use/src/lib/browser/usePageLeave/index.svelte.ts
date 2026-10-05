import { useEventListener } from '../useEventListener/index.ts';

/** Reactive page-leave state returned by {@link usePageLeave}. */
export interface UsePageLeaveReturn {
	/** Whether the pointer has left the page. */
	readonly isLeft: boolean;
}

/**
 * Reactive state for whether the pointer has left the page.
 *
 * Must be called in component initialization (uses `$state`).
 *
 * @returns Getter-backed `isLeft`.
 * @example
 * ```ts
 * const { isLeft } = usePageLeave();
 * ```
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { usePageLeave } from '@wynn-dev/svelte-use';
 *
 *   const { isLeft } = usePageLeave();
 * </script>
 *
 * <p>{isLeft ? 'Come back' : 'Here'}</p>
 * ```
 */
export function usePageLeave(): UsePageLeaveReturn {
	let isLeft = $state(false);

	useEventListener(
		() => window,
		'mouseout',
		(event) => {
			// A nullish `relatedTarget` means the pointer left the window rather
			// than moving to another element in the page.
			isLeft = !event.relatedTarget;
		},
		{ passive: true }
	);

	useEventListener(
		() => document,
		'mouseleave',
		() => {
			isLeft = true;
		},
		{ passive: true }
	);

	// Entering is not the negation of `mouseout`: `mouseenter` from outside the
	// window also has a nullish `relatedTarget`, so one shared handler would set
	// `isLeft` back to `true` on the way in.
	useEventListener(
		() => document,
		'mouseenter',
		() => {
			isLeft = false;
		},
		{ passive: true }
	);

	return {
		get isLeft() {
			return isLeft;
		}
	};
}
