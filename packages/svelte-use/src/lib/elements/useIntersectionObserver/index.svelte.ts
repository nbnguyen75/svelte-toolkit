import type { MaybeElements } from '../../shared/element.ts';
import type { MaybeGetter } from '../../shared/getter.ts';

import { resolveElements } from '../../shared/element.ts';
import { resolveGetter } from '../../shared/getter.ts';
import { isBrowser } from '../../shared/is.ts';

/**
 * Options for {@link useIntersectionObserver}.
 *
 * Every property accepts `undefined`, so a Svelte
 * `let rootMargin = $state<string>()` can be forwarded straight through instead
 * of each caller needing a spread or a `?? default`.
 */
export interface UseIntersectionObserverOptions {
	/**
	 * Element or document whose bounds are used as the bounding box when testing
	 * for intersection. Omitted means the viewport.
	 */
	root?: MaybeGetter<Element | Document | null | undefined> | undefined;
	/** Offsets added to the root's bounding box when calculating intersections. */
	rootMargin?: MaybeGetter<string> | undefined;
	/** Ratio, or ratios, between 0 and 1 at which to fire. @default 0 */
	threshold?: number | number[] | undefined;
	/**
	 * Start observing immediately.
	 *
	 * With `false` the util is set up but observes nothing until `resume()`.
	 * @default true
	 */
	immediate?: boolean | undefined;
}

/** Reactive state returned by {@link useIntersectionObserver}. */
export interface UseIntersectionObserverReturn {
	/** Whether this environment exposes `IntersectionObserver`. Always `false` during SSR. */
	readonly isSupported: boolean;
	/** Whether the observer is currently watching. */
	readonly isActive: boolean;
	/** Start watching again after a `pause()` or `stop()`. */
	resume: () => void;
	/** Disconnect without giving up: `resume()` starts watching again. */
	pause: () => void;
	/** Disconnect permanently. `resume()` does not undo it. */
	stop: () => void;
}

/**
 * Detects changes to a target element's visibility, with the native
 * `IntersectionObserver` and nothing else layered on top.
 *
 * Must be called in component initialization (uses `$effect`). The observer is
 * created per effect run and disconnected when that run is replaced or the
 * component unmounts, so a swapped target never leaves the old one watched.
 *
 * The callback is the platform's, verbatim: it fires as the platform decides,
 * not per frame.
 *
 * @param target Element(s) to watch, or a getter returning them.
 * @param callback Native `IntersectionObserverCallback`.
 * @param options Root, rootMargin, threshold, and whether to start immediately.
 * @returns `isSupported`, `isActive`, `pause`, `resume`, `stop`.
 * @example
 * ```ts
 * const { isActive, pause } = useIntersectionObserver(
 *   () => card,
 *   ([entry]) => console.log(entry.isIntersecting),
 *   { threshold: [0, 0.5, 1] }
 * );
 * pause();
 * ```
 */
export function useIntersectionObserver(
	target: MaybeElements,
	callback: IntersectionObserverCallback,
	options: UseIntersectionObserverOptions = {}
): UseIntersectionObserverReturn {
	const { root, rootMargin, threshold = 0, immediate = true } = options;

	const isSupported = isBrowser && 'IntersectionObserver' in window;

	// `$state`, unlike the other observer utils: pausing has to re-run the effect
	// below so the observer is torn down and rebuilt.
	let isActive = $state(immediate);
	// Plain variables, not `$state`: nothing renders from them.
	let stopped = false;
	let observer: IntersectionObserver | undefined;

	function observe(elements: Element[], init: IntersectionObserverInit): (() => void) | undefined {
		if (elements.length === 0) return undefined;
		const next = new IntersectionObserver(callback, init);
		for (const element of elements) next.observe(element);
		observer = next;
		return () => {
			next.disconnect();
			if (observer === next) observer = undefined;
		};
	}

	$effect(() => {
		// Reading `target`, `root` and `rootMargin` is what tracks them, so a
		// `bind:this` that resolves later, or a changed root, re-observes.
		const elements = resolveElements(target);
		const init: IntersectionObserverInit = {
			root: resolveGetter(root) ?? null,
			rootMargin: resolveGetter(rootMargin) ?? '0px',
			threshold
		};
		// `stopped` is plain, so `stop()` disconnects without re-running this.
		return observe(stopped || !isSupported || !isActive ? [] : elements, init);
	});

	function pause() {
		isActive = false;
	}

	function resume() {
		if (stopped) return;
		isActive = true;
	}

	function stop() {
		stopped = true;
		isActive = false;
		observer?.disconnect();
		observer = undefined;
	}

	return {
		isSupported,
		get isActive() {
			return isActive;
		},
		pause,
		resume,
		stop
	};
}
