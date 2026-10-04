import type { MaybeElement } from '../../shared/element.ts';
import type { MaybeGetter } from '../../shared/getter.ts';

import { resolveGetter } from '../../shared/getter.ts';
import { noop } from '../../shared/is.ts';

/** One entry of {@link OnClickOutsideOptions.ignore}: an element or a CSS selector. */
export type OnClickOutsideIgnored = MaybeElement | string;

/**
 * Options for {@link onClickOutside}.
 *
 * Every property accepts `undefined`, so an uninitialised Svelte
 * `let capture = $state<boolean>()` forwards straight through.
 */
export interface OnClickOutsideOptions {
	/**
	 * Elements whose clicks must not count as outside. Accepts elements and CSS
	 * selectors for markup this util does not hold a reference to; a getter
	 * keeps the list current as it changes.
	 * @default []
	 */
	ignore?: MaybeGetter<OnClickOutsideIgnored[]> | undefined;
	/**
	 * Listen in the capture phase, so a handler that calls `stopPropagation` on
	 * its own click cannot hide the event from this util.
	 * @default true
	 */
	capture?: boolean | undefined;
}

/** Controls returned by {@link onClickOutside}. */
export interface OnClickOutsideReturn {
	/**
	 * Swallow the next outside click, then carry on. For dismissing something
	 * without also activating whatever is underneath it. It survives the
	 * pointerdown that precedes that click, which is what makes it usable from a
	 * pointerdown handler of your own.
	 */
	cancel: () => void;
	/**
	 * Remove the listeners. They are also removed on unmount; this is for
	 * stopping early, and it is permanent.
	 */
	stop: () => void;
}

/**
 * Call a handler when a click lands outside an element.
 *
 * Listens on `window`, not on the element, because the click that matters is
 * the one that went somewhere else.
 *
 * @param target Element that counts as "inside", or a getter for it.
 * @param handler Called with the outside `click` event.
 * @param options `ignore`, `capture`.
 * @returns `stop`, `cancel`.
 * @example
 * ```ts
 * const { cancel } = onClickOutside(() => dialog, close);
 * ```
 */
export function onClickOutside(
	target: MaybeGetter<MaybeElement>,
	handler: (event: PointerEvent) => void,
	options: OnClickOutsideOptions = {}
): OnClickOutsideReturn {
	const { ignore = [], capture = true } = options;

	// Plain variables: nothing renders from them, and making them `$state` would
	// re-run the effect below on every click.
	let armed = true;
	let swallowNext = false;
	let processingClick = false;

	// Annotated, not inferred: a fresh `{ passive: true }` literal is rejected as
	// excess property against the `EventListenerOptions` that the typed window
	// overload asks for, and `AddEventListenerOptions` is what carries `passive`.
	const clickOptions: AddEventListenerOptions = { capture, passive: true };
	const pointerOptions: AddEventListenerOptions = { passive: true };

	function isIgnored(event: Event): boolean {
		return resolveGetter(ignore).some((entry) => {
			const path = event.composedPath();
			if (typeof entry === 'string') {
				// A selector, for markup there is no reference to.
				return [...document.querySelectorAll(entry)].some(
					(el) => el === event.target || path.includes(el)
				);
			}
			return !!entry && (entry === event.target || path.includes(entry));
		});
	}

	function onClick(event: PointerEvent) {
		// One click per tick. A touch generates a compatibility mouse event as
		// well as the pointer sequence, and a handler that tears the UI down
		// would otherwise run for both.
		if (processingClick) return;
		processingClick = true;
		setTimeout(() => {
			processingClick = false;
		}, 0);

		if (event.target == null) return;
		const el = resolveGetter(target);
		if (!el || el === event.target || event.composedPath().includes(el)) return;

		// `detail === 0` means the browser synthesised this click from the
		// keyboard - Enter on a button, Space on a link - so there was no
		// pointerdown to arm against, and the ignore list is all there is to go on.
		if (event.detail === 0) armed = !isIgnored(event);

		if (swallowNext) {
			swallowNext = false;
			return;
		}

		if (!armed) {
			// Swallow it, and re-arm for the next one.
			armed = true;
			return;
		}
		handler(event);
	}

	function onPointerDown(event: PointerEvent) {
		const el = resolveGetter(target);
		armed = !isIgnored(event) && !!el && !event.composedPath().includes(el);
	}

	// The effect exists for its lifecycle, not for tracking: the listeners live
	// on `window` and the target is read at event time, so nothing reactive is
	// involved. It is what removes them on unmount.
	let stopped = false;
	$effect(() => {
		// Always returns a cleanup: a bare `return` trips `consistent-return`.
		if (stopped || typeof window === 'undefined') return noop;
		window.addEventListener('click', onClick, clickOptions);
		window.addEventListener('pointerdown', onPointerDown, pointerOptions);
		return () => {
			window.removeEventListener('click', onClick, clickOptions);
			window.removeEventListener('pointerdown', onPointerDown, pointerOptions);
		};
	});

	return {
		stop() {
			stopped = true;
			// Nothing was ever attached, but the caller can still call this.
			if (typeof window === 'undefined') return;
			window.removeEventListener('click', onClick, clickOptions);
			window.removeEventListener('pointerdown', onPointerDown, pointerOptions);
		},
		cancel() {
			// A flag of its own, not `armed`: the pointerdown that precedes the
			// click re-arms `armed`, which would erase the request before the click
			// it was meant for.
			swallowNext = true;
		}
	};
}
