import type { MaybeGetter } from '../../shared/getter.ts';

import { useResizeObserver } from '../../elements/useResizeObserver/index.ts';
import { resolveGetter } from '../../shared/getter.ts';

/** Which CSS property the computed height is written to. */
export type TextareaAutosizeStyleProp = 'height' | 'minHeight';

/** Options for {@link useTextareaAutosize}. */
export interface UseTextareaAutosizeOptions {
	/** Textarea to size, or a getter re-resolved on every effect run. */
	element?: MaybeGetter<HTMLTextAreaElement | null | undefined>;
	/**
	 * Element to write the height to when the height has to be applied to a
	 * wrapper rather than the textarea itself. The textarea by default.
	 */
	styleTarget?: MaybeGetter<HTMLElement | null | undefined>;
	/** Upper bound in pixels, or a getter for it. Content still scrolls past it. */
	maxHeight?: MaybeGetter<number | undefined>;
	/** Which property to write. Use `minHeight` when CSS owns `height`. */
	styleProp?: TextareaAutosizeStyleProp;
	/** Current content, or a getter for it. Drives the resize. */
	input?: MaybeGetter<string>;
	/** Called after the measured height changes. */
	onResize?: () => void;
}

/** Getter-backed return for {@link useTextareaAutosize}. */
export interface UseTextareaAutosizeReturn {
	/** Last measured `scrollHeight`, or `0` before the first measurement. */
	readonly scrollHeight: number;
	/** Re-measure and re-apply the height now. */
	triggerResize: () => void;
}

/**
 * Grow a textarea to fit its content.
 *
 * Must be called in component initialization — the measurement effect attaches a
 * `ResizeObserver` and detaches on unmount. No-op during SSR.
 *
 * @param options `element`, `input`, `maxHeight`, `styleTarget`, `styleProp`, `onResize`.
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useTextareaAutosize } from '@wynn-dev/svelte-use';
 *
 *   let value = $state('');
 *   let area = $state<HTMLTextAreaElement>();
 *   useTextareaAutosize({ element: () => area, input: () => value });
 * </script>
 *
 * <textarea bind:this={area} bind:value={value} rows="1"></textarea>
 * ```
 */
export function useTextareaAutosize(
	options: UseTextareaAutosizeOptions = {}
): UseTextareaAutosizeReturn {
	const styleProp = options.styleProp ?? 'height';

	let scrollHeight = $state(0);

	// Plain variable, not `$state`: it is only ever read inside an observer
	// callback to decide whether a width change is worth re-measuring.
	let lastWidth = 0;

	function triggerResize(): void {
		const textarea = resolveGetter(options.element ?? null);
		if (!textarea) return;

		// Collapse first so `scrollHeight` reports the content height and not the
		// height a previous pass left behind.
		textarea.style[styleProp] = '1px';
		scrollHeight = textarea.scrollHeight;

		const maxHeight = resolveGetter(options.maxHeight ?? undefined);
		const styleHeight = `${
			maxHeight === undefined ? scrollHeight : Math.min(scrollHeight, maxHeight)
		}px`;

		const target = resolveGetter(options.styleTarget ?? null);
		if (target) target.style[styleProp] = styleHeight;
		else textarea.style[styleProp] = styleHeight;
	}

	// Re-measures whenever the content, the element, or the ceiling changes.
	// `$effect` already runs after the DOM is updated, so VueUse's `nextTick`
	// wrapper is not needed.
	$effect(() => {
		// Read for tracking only: a stale `scrollHeight` is the bug this avoids.
		resolveGetter(options.input ?? '');
		resolveGetter(options.maxHeight ?? undefined);
		const textarea = resolveGetter(options.element ?? null);
		if (!textarea) return;
		triggerResize();
	});

	$effect(() => {
		if (scrollHeight > 0) options.onResize?.();
	});

	// Only a width change needs a re-measure: the height we set is what the
	// observer is reporting in the first place, so reacting to it would loop.
	useResizeObserver(
		() => resolveGetter(options.element ?? null),
		(entries) => {
			const width = entries[0]?.contentRect.width ?? 0;
			if (width === lastWidth) return;
			lastWidth = width;
			triggerResize();
		}
	);

	return {
		triggerResize,
		get scrollHeight() {
			return scrollHeight;
		}
	};
}
