import type { MaybeElements } from '../../shared/element.ts';

import { resolveElements } from '../../shared/element.ts';
import { isBrowser } from '../../shared/is.ts';

/**
 * Native {@link ResizeObserverOptions}, so `box` (`content-box` / `border-box`)
 * passes straight through with its platform meaning.
 */
export type UseResizeObserverOptions = ResizeObserverOptions;

/** Reactive state returned by {@link useResizeObserver}. */
export interface UseResizeObserverReturn {
	/** Whether this environment exposes `ResizeObserver`. Always `false` during SSR. */
	readonly isSupported: boolean;
	/**
	 * Stop observing. Idempotent, and it also stops the target being re-observed
	 * if it changes afterwards.
	 */
	stop: () => void;
}

/**
 * Reports changes to the dimensions of an element's content or border box.
 *
 * Must be called in component initialization (uses `$effect`). The observer is
 * created per effect run and disconnected when that run is replaced or the
 * component unmounts, so a swapped target never leaves the old one watched.
 *
 * The callback is the platform's, verbatim. Note the feedback loop this util
 * cannot protect you from: an element whose size your callback writes will
 * report that write on the next frame. Compare against the previous value and
 * bail out, or you will loop.
 *
 * @param target Element(s) to watch, or a getter returning them.
 * @param callback Native `ResizeObserverCallback`.
 * @param options Native `ResizeObserverOptions`.
 * @returns `isSupported` and `stop`.
 * @example
 * ```ts
 * const { stop } = useResizeObserver(
 *   () => panel,
 *   ([entry]) => console.log(entry.contentRect.width),
 *   { box: 'border-box' }
 * );
 * stop();
 * ```
 */
export function useResizeObserver(
	target: MaybeElements,
	callback: ResizeObserverCallback,
	options: UseResizeObserverOptions = {}
): UseResizeObserverReturn {
	const isSupported = isBrowser && 'ResizeObserver' in window;

	// Plain variables, not `$state`: nothing renders from them, and making them
	// reactive would re-arm the effect below on every write.
	let stopped = false;
	let observer: ResizeObserver | undefined;

	function observe(elements: Element[]): (() => void) | undefined {
		if (elements.length === 0) return undefined;
		const next = new ResizeObserver(callback);
		for (const element of elements) next.observe(element, options);
		observer = next;
		return () => {
			next.disconnect();
			if (observer === next) observer = undefined;
		};
	}

	$effect(() => {
		// Reading `target` is what tracks it, so a `bind:this` that resolves
		// later - or a reactive list that changes - re-observes. `stopped` is a
		// plain variable, so `stop()` disconnects without re-running this.
		return observe(stopped || !isSupported ? [] : resolveElements(target));
	});

	function stop() {
		stopped = true;
		observer?.disconnect();
		observer = undefined;
	}

	return {
		isSupported,
		stop
	};
}
