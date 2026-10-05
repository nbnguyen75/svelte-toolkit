import type { UseRafFnReturn } from '../useRafFn/index.ts';

import { SvelteDate } from 'svelte/reactivity';

import { useRafFn } from '../useRafFn/index.ts';

/**
 * Reactive clock: a {@link Date} refreshed on every animation frame.
 *
 * Extends {@link UseRafFnReturn}, so the loop is already running when this
 * returns and `pause` / `resume` / `isActive` behave exactly as they do there.
 */
export interface UseNowReturn extends UseRafFnReturn {
	/** The current date. Getter-backed, and a new `Date` on every frame. */
	readonly now: Date;
}

/**
 * Reactive current `Date`, replaced on every animation frame.
 *
 * The frame loop is the shipped {@link useRafFn} and nothing more, so this owns
 * no timing logic of its own: it exists to own the `Date`, which `useRafFn`
 * hands you only as a callback argument.
 *
 * Pausing freezes the value where it stood rather than resetting it, and
 * `resume()` picks up from the current clock - there is no catch-up burst, since
 * nothing is counting missed frames.
 *
 * @returns `now` plus the loop's `isActive`, `pause` and `resume`.
 * @example
 * ```ts
 * const { now } = useNow();
 * // re-renders a template that renders `now` once per frame
 * ```
 * @example
 * ```svelte
 * <script lang="ts">
 * 	import { useNow } from '@wynn-dev/svelte-use';
 *
 * 	const { now, pause, resume } = useNow();
 * </script>
 *
 * <p>{now.toLocaleTimeString()}</p>
 * <button onclick={pause}>Freeze</button>
 * <button onclick={resume}>Resume</button>
 * ```
 */
export function useNow(): UseNowReturn {
	// `SvelteDate` rather than `Date`: the lint rule asks for it, and it *is* a
	// `Date` (`instanceof` and every method hold). The whole instance is
	// replaced each frame rather than mutated, so the reactive plumbing it adds
	// over the built-in is unused — but it is the class this package is meant to
	// hold, and on the server it is `globalThis.Date` anyway.
	let now = $state.raw(new SvelteDate());

	const raf = useRafFn(() => {
		now = new SvelteDate();
	});

	return {
		get isActive() {
			return raf.isActive;
		},
		get now() {
			return now;
		},
		pause: raf.pause,
		resume: raf.resume
	};
}
