import type { MaybeGetter } from '../../shared/getter.ts';
import type {
	UseScrollOptions,
	UseScrollReturn,
	UseScrollTarget,
	UseScrollEdges
} from '../useScroll/index.ts';

import { untrack, tick } from 'svelte';

import { useElementVisibility } from '../../elements/useElementVisibility/index.ts';
import { scrollElementOf } from '../../shared/element.ts';
import { resolveGetter } from '../../shared/getter.ts';
import { isBrowser } from '../../shared/is.ts';
import { useScroll } from '../useScroll/index.ts';

/**
 * Edge to watch, taken straight from `useScroll`'s edges so the two can never
 * drift apart.
 */
export type UseInfiniteScrollDirection = keyof UseScrollEdges;

/** Options for {@link useInfiniteScroll}. */
export interface UseInfiniteScrollOptions extends UseScrollOptions {
	/**
	 * Whether more content may be loaded right now. Read on every check, so it
	 * can depend on reactive state such as "there is a next page".
	 *
	 * Receives the observed element - for a `Window` or `Document` target that is
	 * `document.documentElement`, since neither can be observed directly.
	 *
	 * @default () => true
	 */
	canLoadMore?: (element: HTMLElement | SVGElement) => boolean;
	/**
	 * Which edge to load more on.
	 *
	 * @default 'bottom'
	 */
	direction?: UseInfiniteScrollDirection;
	/**
	 * Called when `onLoadMore` rejects. A rejected load still clears `isLoading`
	 * and re-checks, so one failure cannot wedge the list.
	 *
	 * @default console.error
	 */
	onError?: (error: unknown) => void;
	/**
	 * Minimum distance between the end of the content and the edge of the
	 * viewport at which loading starts.
	 *
	 * Applied as that edge's scroll offset. An explicit `offset[direction]` wins
	 * over this, as it does upstream.
	 *
	 * @default 0
	 */
	distance?: number;
	/**
	 * Minimum time between two loads, so a short list cannot spin the loader.
	 *
	 * Runs concurrently with `onLoadMore`, so the real gap is
	 * `max(onLoadMore, interval)` - this is a floor, not a delay added on top.
	 *
	 * @default 100
	 */
	interval?: number;
}

/** Reactive infinite scroll return value. */
export interface UseInfiniteScrollReturn {
	/** Whether a load is in flight. Getter-backed. */
	readonly isLoading: boolean;
	/** Re-check the edge after the DOM settles, e.g. after appending rows. */
	reset: () => void;
}

/**
 * Loads more content when a scroll container reaches one of its edges.
 *
 * Composes three shipped utils and adds no observer of its own: `useScroll`
 * reports the edges, `useElementVisibility` (and through it
 * `useIntersectionObserver`) decides when the container is on screen at all, and
 * this only decides whether the edge has arrived.
 *
 * Must be called in component initialization.
 *
 * @param element Scroll container, or a getter re-resolved on every effect run.
 * @param onLoadMore Called when the edge arrives; receives the scroll state, and may return a promise.
 * @param options `distance`, `direction`, `interval`, `canLoadMore`, `onError`, plus every `useScroll` option.
 * @returns `isLoading` and `reset`.
 * @example
 * ```svelte
 * <script lang="ts">
 * 	import { useInfiniteScroll } from '@wynn-dev/svelte-use';
 *
 * 	let list: HTMLDivElement;
 * 	let page = $state(0);
 * 	const { isLoading } = useInfiniteScroll(
 * 		() => list,
 * 		async () => {
 * 			page += 1;
 * 			await loadPage(page);
 * 		},
 * 		{ distance: 200 }
 * 	);
 * </script>
 *
 * <div bind:this={list}>{#each rows as row (row.id)}<p>{row.label}</p>{/each}</div>
 * ```
 */
export function useInfiniteScroll(
	element: MaybeGetter<UseScrollTarget>,
	onLoadMore: (state: UseScrollReturn) => void | Promise<void>,
	options: UseInfiniteScrollOptions = {}
): UseInfiniteScrollReturn {
	const {
		direction = 'bottom',
		distance = 0,
		interval = 100,
		canLoadMore = () => true,
		onError = (error: unknown) => {
			console.error(error);
		},
		offset,
		...scrollOptions
	} = options;

	const state = useScroll(element, {
		...scrollOptions,
		offset: { [direction]: distance, ...offset }
	});

	// A `Window` or `Document` scrolls as its `documentElement`, and neither can
	// be handed to an IntersectionObserver, so both resolve to the element that
	// can be. `null` until the getter produces something observable - and `null`
	// outright off the browser, so a `() => window` target cannot throw on the
	// server, where there is nothing to observe in the first place.
	const observedElement = $derived(isBrowser ? scrollElementOf(resolveGetter(element)) : null);
	// Not destructured: `isVisible` is a getter, so destructuring would snapshot
	// it once and the effect below would never see it change.
	const visibility = useElementVisibility(() => observedElement);

	let isLoading = $state(false);
	let sleepTimer: ReturnType<typeof setTimeout> | undefined;
	let unmounted = false;

	$effect(() => {
		return () => {
			// Abandon an in-flight load: the `interval` sleep is cleared, so the
			// `Promise.all` below never settles and nothing writes after teardown.
			unmounted = true;
			if (sleepTimer !== undefined) clearTimeout(sleepTimer);
			sleepTimer = undefined;
		};
	});

	function sleep(ms: number): Promise<void> {
		return new Promise((resolve) => {
			sleepTimer = setTimeout(() => {
				sleepTimer = undefined;
				resolve();
			}, ms);
		});
	}

	function load(): void {
		isLoading = true;
		// `onLoadMore` is called through `.then` so a synchronous throw is a
		// rejection like any other and still reaches `onError` - called directly,
		// it would escape before `Promise.all` could attach the handler.
		void Promise.all([Promise.resolve().then(() => onLoadMore(state)), sleep(interval)])
			.catch(onError)
			.finally(() => {
				if (unmounted) return;
				isLoading = false;
				void tick().then(recheck);
			});
	}

	function checkAndLoad(
		el: HTMLElement | SVGElement | null,
		visible: boolean,
		arrived: boolean
	): void {
		// `canLoadMore` is asked on every check rather than memoized in a
		// `$derived`, so a plain `() => page < lastPage` gate works and is never
		// cached against the wrong value.
		if (!el || !visible || isLoading || !canLoadMore(el)) return;

		const isNarrower =
			direction === 'bottom' || direction === 'top'
				? el.scrollHeight <= el.clientHeight
				: el.scrollWidth <= el.clientWidth;

		// Content shorter than the viewport reports no edge to arrive at, so it
		// counts as arrived - otherwise the first page could never grow.
		if (arrived || isNarrower) load();
	}

	/** Re-check with current values. Used from `reset` and after a load settles. */
	function recheck(): void {
		state.measure();
		checkAndLoad(observedElement, visibility.isVisible, state.arrivedState[direction]);
	}

	$effect(() => {
		// The inputs below are what this effect subscribes to, so a `bind:this`
		// that resolves later, the container scrolling on screen, and the edge
		// being reached all re-check.
		const el = observedElement;
		const visible = visibility.isVisible;

		// Measures first: layout can move the edge without a scroll event (an
		// image finishing loads). Untracked, because `measure()` writes the very
		// `arrivedState` read next - tracked, that write would re-arm this effect.
		untrack(() => state.measure());
		const arrived = state.arrivedState[direction];

		checkAndLoad(el, visible, arrived);
	});

	return {
		get isLoading() {
			return isLoading;
		},
		reset() {
			void tick().then(recheck);
		}
	};
}
