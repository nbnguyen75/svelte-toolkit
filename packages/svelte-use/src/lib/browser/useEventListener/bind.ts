import { noop } from '../../shared/is.ts';

/**
 * Attach `handler` to `target` and return the matching detach function. Returns a
 * no-op when there is nothing to attach, so a caller's cleanup is always
 * callable (an `undefined` return trips `consistent-return`).
 *
 * Internal. Not re-exported from `index.ts`, so it stays out of the package
 * barrel: utils that need their own effect — to hold the detachers for a
 * `stop()`, or to read an option that must be evaluated *at bind time* like
 * `passive` — import this rather than `useEventListener`. Reading such an option
 * outside the binding effect would freeze it, because `useEventListener` takes
 * `options` as a value.
 */
export function bindListener(
	target: EventTarget | null | undefined,
	event: string,
	handler: (e: Event) => void,
	options: boolean | AddEventListenerOptions | undefined
): () => void {
	if (!target) return noop;
	target.addEventListener(event, handler, options);
	return () => {
		target.removeEventListener(event, handler, options);
	};
}
