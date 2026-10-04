import type { MaybeElement } from '../../shared/element.ts';
import type { MaybeGetter } from '../../shared/getter.ts';

import { useIntersectionObserver } from '../useIntersectionObserver/index.ts';

/**
 * Options for {@link useElementVisibility}.
 *
 * Every property accepts `undefined`, so a Svelte
 * `let scrollTarget = $state<Element>()` can be forwarded straight through
 * instead of each caller needing a spread or a `?? default`.
 */
export interface UseElementVisibilityOptions {
	/**
	 * Element or document used as the viewport instead of the real one.
	 *
	 * This is what makes "visible inside this scroll container" possible; the
	 * observer's `root` is fixed at construction, so a getter here re-observes.
	 */
	scrollTarget?: MaybeGetter<Element | Document | null | undefined> | undefined;
	/** Offsets added to the root's bounding box when calculating intersections. */
	rootMargin?: MaybeGetter<string> | undefined;
	/** Ratio, or ratios, between 0 and 1 at which visibility is re-evaluated. @default 0 */
	threshold?: number | number[] | undefined;
	/**
	 * Value reported before the first intersection report arrives.
	 *
	 * The observer always reports once on `observe()`, so this is what a
	 * not-yet-visible element reports until it scrolls into view.
	 * @default false
	 */
	initialValue?: boolean | undefined;
	/**
	 * Stop observing after visibility changes for the first time.
	 *
	 * The initial report does not count as a change, so an element that starts
	 * off-screen still runs until it is seen once.
	 * @default false
	 */
	once?: boolean | undefined;
}

/** Reactive state returned by {@link useElementVisibility}. */
export interface UseElementVisibilityReturn {
	/** Whether the element is currently intersecting its viewport. */
	readonly isVisible: boolean;
	/** Stop observing. Idempotent. */
	stop: () => void;
}

/**
 * Track whether an element is inside its viewport.
 *
 * Must be called in component initialization — it uses `$effect` through
 * {@link useIntersectionObserver}, so a `bind:this` that resolves later is
 * picked up.
 *
 * The returned `isVisible` is a getter over reactive state, so destructuring
 * the object keeps working and reading it in a template or `$derived` tracks.
 *
 * @param element Element to watch, or a getter returning it.
 * @param options `initialValue`, `scrollTarget`, `rootMargin`, `threshold`, `once`.
 * @returns `isVisible` and `stop`.
 * @example
 * ```ts
 * const { isVisible } = useElementVisibility(() => card, {
 *   scrollTarget: () => scroller
 * });
 * ```
 */
export function useElementVisibility(
	element: MaybeGetter<MaybeElement>,
	options: UseElementVisibilityOptions = {}
): UseElementVisibilityReturn {
	const { scrollTarget, rootMargin, threshold = 0, once = false, initialValue = false } = options;

	let isVisible = $state(initialValue);

	// `onReports` is a hoisted declaration, so the observer can be built before
	// it is defined; the platform can only invoke it once the observer exists.
	// That is also why `once` can reach `observer` without a `let`.
	const observer = useIntersectionObserver(element, onReports, {
		root: scrollTarget,
		rootMargin,
		threshold
	});

	function onReports(entries: IntersectionObserverEntry[]) {
		// Entries in one delivery can disagree when the element crossed a
		// threshold mid-batch, so the latest one by `time` is the truth.
		let latest = isVisible;
		let latestTime = 0;
		for (const entry of entries) {
			if (entry.time >= latestTime) {
				latestTime = entry.time;
				latest = entry.isIntersecting;
			}
		}

		if (latest === isVisible) return;
		isVisible = latest;
		// `once` stops on the first *change*, so the unconditional report the
		// platform makes on `observe()` does not consume it.
		if (once) observer.stop();
	}

	return {
		get isVisible() {
			return isVisible;
		},
		stop: observer.stop
	};
}
