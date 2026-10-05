import type { MaybeElement } from '../../shared/element.ts';
import type { MaybeGetter } from '../../shared/getter.ts';

import { resolveGetter } from '../../shared/getter.ts';
import { isBrowser } from '../../shared/is.ts';
import { useEventListener } from '../useEventListener/index.ts';

const noop = () => {};

/** Options for {@link useFullscreen}. */
export interface UseFullscreenOptions {
	/**
	 * Leave fullscreen when the owning component is destroyed.
	 *
	 * @default false
	 */
	autoExit?: boolean;
}

/** Reactive fullscreen state and controls returned by {@link useFullscreen}. */
export interface UseFullscreenReturn {
	/** Whether the target is the element currently in fullscreen. */
	readonly isFullscreen: boolean;
	/** Whether the element can enter fullscreen in this browser. */
	readonly isSupported: boolean;
	/** Enter when out, exit when in. */
	toggle: () => Promise<void>;
	/** Request fullscreen for the target. Resolves once the request settles. */
	enter: () => Promise<void>;
	/** Leave fullscreen. */
	exit: () => Promise<void>;
}

/**
 * Reactive Fullscreen API: whether the target is fullscreen, plus `enter`,
 * `exit` and `toggle`.
 *
 * Must be called in component initialization (uses `$state`).
 *
 * @param target Element to watch, or a getter re-resolved on every effect run.
 * Defaults to `document.documentElement`.
 * @param options `autoExit`.
 * @returns Getter-backed `isSupported` and `isFullscreen`, plus the controls.
 * @example
 * ```ts
 * const { isFullscreen, enter, exit, toggle } = useFullscreen(() => el);
 * ```
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useFullscreen } from '@wynn-dev/svelte-use';
 *
 *   let el: HTMLDivElement;
 *   const { isFullscreen, toggle } = useFullscreen(() => el);
 * </script>
 *
 * <div bind:this={el}>{isFullscreen ? 'Fullscreen' : 'Windowed'}</div>
 * <button onclick={toggle}>Toggle</button>
 * ```
 */
export function useFullscreen(
	target?: MaybeGetter<MaybeElement>,
	options: UseFullscreenOptions = {}
): UseFullscreenReturn {
	const { autoExit = false } = options;

	let isFullscreen = $state(false);

	/** The element to fullscreen, defaulting to the whole document. */
	const targetElement = $derived(
		isBrowser ? (resolveGetter(target) ?? document.documentElement) : null
	);

	// Presence, not capability: `fullscreenEnabled` is a permission flag (an iframe
	// without `allowfullscreen` reports false), so it is deliberately not part of
	// this. What `enter` and `exit` need is the two methods.
	const isSupported = $derived(
		targetElement !== null && 'requestFullscreen' in targetElement && 'exitFullscreen' in document
	);

	/**
	 * Adopt the browser's own answer.
	 *
	 * A `fullscreenchange` naming some *other* element is left alone: another
	 * component's fullscreen is not this flag's business.
	 */
	function sync(): void {
		if (!isBrowser) return;
		const current = document.fullscreenElement;
		if (current === null) isFullscreen = false;
		else if (current === targetElement) isFullscreen = true;
	}

	async function exit(): Promise<void> {
		if (!isSupported || !isFullscreen) return;
		await document.exitFullscreen();
		isFullscreen = false;
	}

	async function enter(): Promise<void> {
		if (!isSupported || isFullscreen) return;
		const element = targetElement;
		if (!element) return;
		await element.requestFullscreen();
		isFullscreen = true;
	}

	async function toggle(): Promise<void> {
		await (isFullscreen ? exit() : enter());
	}

	useEventListener(() => document, 'fullscreenchange', sync, { passive: true });

	// Runs after mount, so a target that arrives with `bind:this` is already
	// resolved - the reason VueUse defers this to a mounted hook.
	$effect(() => {
		sync();
	});

	// Its own effect on purpose: folding this into the one above would run the
	// teardown on every target change, exiting fullscreen when the target rebinds.
	$effect(() => {
		if (!autoExit) return noop;
		return () => {
			void exit();
		};
	});

	return {
		get isSupported() {
			return isSupported;
		},
		get isFullscreen() {
			return isFullscreen;
		},
		enter,
		exit,
		toggle
	};
}
