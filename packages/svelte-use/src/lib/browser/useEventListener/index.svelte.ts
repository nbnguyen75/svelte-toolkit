import type { MaybeGetter } from '../../shared/getter.ts';

import { resolveGetter } from '../../shared/getter.ts';
import { isBrowser } from '../../shared/is.ts';

const noop = () => {};

/**
 * Attach `handler` to `el` and return the matching detach function. Returns a
 * no-op when there is nothing to attach, so the `$effect` cleanup below is
 * always callable (an `undefined` return trips `consistent-return`).
 */
function bindListener(
	el: EventTarget | null | undefined,
	event: string,
	handler: (e: Event) => void,
	options: boolean | AddEventListenerOptions | undefined
): () => void {
	if (!el) return noop;
	el.addEventListener(event, handler, options);
	return () => {
		el.removeEventListener(event, handler, options);
	};
}

/**
 * Listen for a `Window` event. No-op during SSR or when the target is nullish.
 *
 * @param target Window to listen on, or a getter re-resolved on every effect run.
 * @param event Event name, typed from `WindowEventMap`.
 * @param handler Listener invoked with the typed event.
 * @param options Capture/once/passive flags, forwarded to `addEventListener` as-is.
 * @example
 * ```ts
 * useEventListener(() => window, 'click', (event) => console.log(event.clientX));
 * ```
 */
export function useEventListener<K extends keyof WindowEventMap>(
	target: MaybeGetter<Window | null | undefined>,
	event: K,
	handler: (e: WindowEventMap[K]) => void,
	options?: boolean | AddEventListenerOptions
): void;

/**
 * Listen for a `Document` event. No-op during SSR or when the target is nullish.
 *
 * @param target Document to listen on, or a getter re-resolved on every effect run.
 * @param event Event name, typed from `DocumentEventMap`.
 * @param handler Listener invoked with the typed event.
 * @param options Capture/once/passive flags, forwarded to `addEventListener` as-is.
 * @example
 * ```ts
 * useEventListener(() => document, 'keydown', (event) => console.log(event.key));
 * ```
 */
export function useEventListener<K extends keyof DocumentEventMap>(
	target: MaybeGetter<Document | null | undefined>,
	event: K,
	handler: (e: DocumentEventMap[K]) => void,
	options?: boolean | AddEventListenerOptions
): void;

/**
 * Listen for an `HTMLElement` event. No-op during SSR or when the target is nullish.
 *
 * @param target Element to listen on, or a getter re-resolved on every effect run.
 * @param event Event name, typed from `HTMLElementEventMap`.
 * @param handler Listener invoked with the typed event.
 * @param options Capture/once/passive flags, forwarded to `addEventListener` as-is.
 * @example
 * ```ts
 * useEventListener(() => element, 'click', () => console.log('clicked'), { once: true });
 * ```
 */
export function useEventListener<K extends keyof HTMLElementEventMap>(
	target: MaybeGetter<HTMLElement | null | undefined>,
	event: K,
	handler: (e: HTMLElementEventMap[K]) => void,
	options?: boolean | AddEventListenerOptions
): void;

/**
 * Listen for a `MediaQueryList` event (e.g. `change`). No-op during SSR or when
 * the target is nullish.
 *
 * @param target Media query list to listen on, or a getter re-resolved on every effect run.
 * @param event Event name, typed from `MediaQueryListEventMap`.
 * @param handler Listener invoked with the typed event.
 * @param options Capture/once/passive flags, forwarded to `addEventListener` as-is.
 * @example
 * ```ts
 * useEventListener(() => mql, 'change', (e) => console.log(e.matches));
 * ```
 */
export function useEventListener<K extends keyof MediaQueryListEventMap>(
	target: MaybeGetter<MediaQueryList | null | undefined>,
	event: K,
	handler: (e: MediaQueryListEventMap[K]) => void,
	options?: boolean | AddEventListenerOptions
): void;

/**
 * Listen for an event on any `EventTarget` (e.g. `VisualViewport`, `WebSocket`,
 * or a target without a dedicated event map). No-op during SSR or when the
 * target is nullish.
 *
 * @param target Event target, or a getter re-resolved on every effect run.
 * @param event Event name.
 * @param handler Listener invoked with the event.
 * @param options Capture/once/passive flags, forwarded to `addEventListener` as-is.
 * @example
 * ```ts
 * useEventListener(() => socket, 'message', (e) => console.log(e.data));
 * ```
 */
export function useEventListener(
	target: MaybeGetter<EventTarget | null | undefined>,
	event: string,
	handler: (e: Event) => void,
	options?: boolean | AddEventListenerOptions
): void;

export function useEventListener(
	target: MaybeGetter<EventTarget | null | undefined>,
	event: string,
	handler: (e: Event) => void,
	options?: boolean | AddEventListenerOptions
): void {
	$effect(() => bindListener(isBrowser ? resolveGetter(target) : null, event, handler, options));
}
