import type { MaybeGetter } from '../../shared/getter.ts';

import { resolveGetter } from '../../shared/getter.ts';
import { isBrowser, noop } from '../../shared/is.ts';
import { useEventListener } from '../useEventListener/index.svelte.ts';

/** Decides whether an incoming keyboard event is the one you want. */
export type KeyPredicate = (event: KeyboardEvent) => boolean;

/** One key name, a list of them, a predicate, or `true` for every key. */
export type KeyFilter = true | string | string[] | KeyPredicate;

/** Which keyboard event to listen for. */
export type KeyStrokeEventName = 'keydown' | 'keypress' | 'keyup';

/** Handler invoked for a matching key. */
export type KeyStrokeHandler = (event: KeyboardEvent) => void;

/** Options for {@link onKeyStroke}. */
export interface OnKeyStrokeOptions {
	/**
	 * Target to listen on. Window by default, which is what a keyboard shortcut
	 * usually wants.
	 */
	target?: MaybeGetter<EventTarget | null | undefined>;
	/**
	 * Which keyboard event to listen for.
	 * @default 'keydown'
	 */
	eventName?: KeyStrokeEventName;
	/**
	 * Ignore auto-repeat, so a held key fires once instead of at the key's
	 * repeat rate. Read on every event, so a getter makes it switchable.
	 * @default false
	 */
	dedupe?: MaybeGetter<boolean>;
	/**
	 * Register a passive listener. Leave it off if the handler calls
	 * `preventDefault()`.
	 * @default false
	 */
	passive?: boolean;
}

/**
 * Narrow without `instanceof` (banned for DOM types) and without an assertion:
 * every keyboard event carries `key`, and the DOM types this can receive do not.
 */
function isKeyboardEvent(event: Event): event is KeyboardEvent {
	return 'key' in event;
}

function createKeyPredicate(keyFilter: KeyFilter | KeyStrokeHandler): KeyPredicate {
	if (typeof keyFilter === 'function') {
		// Only reachable as a predicate: the `(handler, options)` shape never
		// passes a filter here, and a handler returns `void`.
		return (event) => Boolean(keyFilter(event));
	}
	if (typeof keyFilter === 'string') return (event) => event.key === keyFilter;
	if (Array.isArray(keyFilter)) return (event) => keyFilter.includes(event.key);
	return () => true;
}

/**
 * Fold the two call shapes — `(key, handler, options)` and
 * `(handler, options)` — into one tuple.
 *
 * A `KeyPredicate` and a `KeyStrokeHandler` are both functions, so the *second*
 * argument decides which shape this is: only the `(key, handler)` form has a
 * function there. The filter slot keeps its widened union type rather than being
 * narrowed by assertion, which this repo bans.
 */
function resolveArgs(
	keyOrHandler: KeyFilter | KeyStrokeHandler,
	handlerOrOptions?: KeyStrokeHandler | OnKeyStrokeOptions,
	options?: OnKeyStrokeOptions
): [KeyFilter | KeyStrokeHandler, KeyStrokeHandler, OnKeyStrokeOptions] {
	const second = handlerOrOptions;
	if (typeof second === 'function') return [keyOrHandler, second, options ?? {}];
	// The `(handler, options)` shape carries no filter, so slot one is `true`.
	// Putting the handler there would wrap it as a predicate as well and run it
	// twice per keystroke.
	if (typeof keyOrHandler === 'function') return [true, keyOrHandler, second ?? {}];
	return [keyOrHandler, noop, second ?? {}];
}

/**
 * Listen for keyboard keystrokes, optionally filtered by key. Must be called in
 * component initialization — the listener is attached in an `$effect` and
 * removed on unmount, so there is no stop function to keep.
 *
 * @param key Key name, list of names, predicate, or `true` for every key.
 * @param handler Called with the matching event.
 * @param options `eventName`, `target`, `passive`, `dedupe`.
 * @example
 * ```ts
 * onKeyStroke('Escape', () => close());
 * ```
 */
export function onKeyStroke(
	key: KeyFilter,
	handler: KeyStrokeHandler,
	options?: OnKeyStrokeOptions
): void;

/**
 * Listen for every keystroke on a target, with no key filter.
 *
 * @param handler Called with every keyboard event.
 * @param options `eventName`, `target`, `passive`, `dedupe`.
 * @example
 * ```ts
 * onKeyStroke((event) => console.log(event.key), { target: () => input });
 * ```
 */
export function onKeyStroke(handler: KeyStrokeHandler, options?: OnKeyStrokeOptions): void;

export function onKeyStroke(
	keyOrHandler: KeyFilter | KeyStrokeHandler,
	handlerOrOptions?: KeyStrokeHandler | OnKeyStrokeOptions,
	options?: OnKeyStrokeOptions
): void {
	const [key, handler, opts] = resolveArgs(keyOrHandler, handlerOrOptions, options);
	const predicate = createKeyPredicate(key);

	useEventListener(
		() => (opts.target === undefined ? (isBrowser ? window : null) : resolveGetter(opts.target)),
		opts.eventName ?? 'keydown',
		(event) => {
			if (!isKeyboardEvent(event)) return;
			if (event.repeat && resolveGetter(opts.dedupe ?? false)) return;
			if (predicate(event)) handler(event);
		},
		opts.passive
	);
}

/**
 * Listen for `keydown` on the given key. `onKeyStroke` with `eventName` fixed.
 *
 * @param key Key name, list of names, predicate, or `true` for every key.
 * @param handler Called with the matching event.
 * @param options `target`, `passive`, `dedupe`.
 * @example
 * ```ts
 * onKeyDown(['Control', 's'], () => save());
 * ```
 */
export function onKeyDown(
	key: KeyFilter,
	handler: KeyStrokeHandler,
	options?: Omit<OnKeyStrokeOptions, 'eventName'>
): void {
	onKeyStroke(key, handler, { ...options, eventName: 'keydown' });
}

/**
 * Listen for `keypress` on the given key. `keypress` is deprecated and does not
 * fire for non-printable keys; prefer {@link onKeyDown}.
 *
 * @param key Key name, list of names, predicate, or `true` for every key.
 * @param handler Called with the matching event.
 * @param options `target`, `passive`, `dedupe`.
 * @example
 * ```ts
 * onKeyPressed('a', (event) => console.log(event.key, event.repeat));
 * ```
 */
export function onKeyPressed(
	key: KeyFilter,
	handler: KeyStrokeHandler,
	options?: Omit<OnKeyStrokeOptions, 'eventName'>
): void {
	onKeyStroke(key, handler, { ...options, eventName: 'keypress' });
}

/**
 * Listen for `keyup` on the given key.
 *
 * @param key Key name, list of names, predicate, or `true` for every key.
 * @param handler Called with the matching event.
 * @param options `target`, `passive`, `dedupe`.
 * @example
 * ```ts
 * onKeyUp('Shift', () => console.log('shift released'));
 * ```
 */
export function onKeyUp(
	key: KeyFilter,
	handler: KeyStrokeHandler,
	options?: Omit<OnKeyStrokeOptions, 'eventName'>
): void {
	onKeyStroke(key, handler, { ...options, eventName: 'keyup' });
}
