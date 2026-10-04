import type { MaybeElements } from '../../shared/element.ts';

import { resolveElements } from '../../shared/element.ts';
import { isBrowser } from '../../shared/is.ts';

/**
 * Native {@link MutationObserverInit}, so `childList`, `subtree`, `attributes`,
 * `characterData`, `attributeOldValue` and `characterDataOldValue` all pass
 * straight through with their platform semantics.
 */
export type UseMutationObserverOptions = MutationObserverInit;

/** Reactive state returned by {@link useMutationObserver}. */
export interface UseMutationObserverReturn {
	/**
	 * Records queued but not yet delivered. `undefined` once stopped — an
	 * unobserved target has nothing queued.
	 */
	takeRecords: () => MutationRecord[] | undefined;
	/** Whether this environment exposes `MutationObserver`. Always `false` during SSR. */
	readonly isSupported: boolean;
	/**
	 * Disconnect and stop observing. Idempotent, and it also stops the target
	 * being re-observed if it changes afterwards.
	 */
	stop: () => void;
}

/**
 * Watch for changes being made to the DOM tree, with the native
 * `MutationObserver` and nothing else layered on top.
 *
 * Must be called in component initialization (uses `$effect`). The observer is
 * created per effect run and disconnected when that run is replaced or the
 * component unmounts, so a swapped target never leaves the old one watched.
 *
 * The callback is the platform's, verbatim: it fires once per batched delivery
 * as a microtask, not once per mutation.
 *
 * @param target Element(s) to watch, or a getter returning them.
 * @param callback Native `MutationCallback`.
 * @param options Native `MutationObserverInit`.
 * @returns `isSupported`, `stop`, `takeRecords`.
 * @example
 * ```ts
 * const { stop } = useMutationObserver(
 *   () => list,
 *   (records) => console.log(records.length, 'changes'),
 *   { childList: true }
 * );
 * stop();
 * ```
 */
export function useMutationObserver(
	target: MaybeElements,
	callback: MutationCallback,
	options: UseMutationObserverOptions = {}
): UseMutationObserverReturn {
	const isSupported = isBrowser && 'MutationObserver' in window;

	// Plain variables, not `$state`: nothing renders from them, and making them
	// reactive would re-arm the effect below on every write.
	let stopped = false;
	let observer: MutationObserver | undefined;

	function observe(elements: Element[]): (() => void) | undefined {
		if (elements.length === 0) return undefined;
		const next = new MutationObserver(callback);
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

	function takeRecords() {
		return observer?.takeRecords();
	}

	return {
		isSupported,
		stop,
		takeRecords
	};
}
