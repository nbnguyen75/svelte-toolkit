import type { MaybeGetter } from '../../shared/getter.ts';

import { resolveGetter } from '../../shared/getter.ts';
import { isBrowser } from '../../shared/is.ts';
import { useEventListener } from '../useEventListener/index.svelte.ts';

/** Options for {@link onStartTyping}. */
export interface OnStartTypingOptions {
	/**
	 * Decides whether a keystroke counts as "typing". Override to count other
	 * keys, e.g. punctuation.
	 */
	isTypedCharValid?: (event: KeyboardEvent) => boolean;
	/** Document to listen on. `document` by default. */
	document?: MaybeGetter<Document | null | undefined>;
	/**
	 * Decides whether the focused element swallows the keystroke. Override to add
	 * your own editor (a canvas, a CodeMirror instance).
	 */
	isFocusedElementEditable?: () => boolean;
}

/**
 * True when the focused element would consume the keystroke itself, so typing
 * into it is not "typing on the page".
 *
 * Covers `<input>`, `<textarea>`, and anything with `contenteditable`. False
 * when nothing is focused, when focus is on `<body>`, and during SSR.
 *
 * @example
 * ```ts
 * if (isFocusedElementEditable()) return; // the user is in a field
 * ```
 */
export function isFocusedElementEditable(): boolean {
	if (!isBrowser) return false;
	const { activeElement, body } = document;
	if (!activeElement) return false;
	// No element focused means the page itself has focus, which is not editable.
	if (activeElement === body) return false;
	if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') return true;
	return activeElement.hasAttribute('contenteditable');
}

/**
 * True when a keystroke looks like typing rather than a command.
 *
 * Any modifier rejects the event: Ctrl/⌘/Alt combinations are shortcuts, even
 * when they produce a printable character (⌘K, Alt+1 on a Mac layout).
 *
 * A key of exactly one character is a printable character, which covers digits,
 * letters and punctuation across layouts. VueUse's check reads the deprecated
 * `keyCode` against `0-9`/`A-Z` ranges, so it misses punctuation entirely and
 * reports layout-dependent results; see the README.
 *
 * @example
 * ```ts
 * onKeyStroke((event) => console.log(isTypedCharValid(event)));
 * ```
 */
export function isTypedCharValid(event: KeyboardEvent): boolean {
	if (event.metaKey || event.ctrlKey || event.altKey) return false;
	return event.key.length === 1;
}

/**
 * Fires when the user starts typing on a non-editable part of the page. Classic
 * use is revealing a keyboard-shortcut hint the moment someone reaches for the
 * keyboard.
 *
 * Must be called in component initialization — the listener is attached in an
 * `$effect` and removed on unmount. No-op during SSR.
 *
 * @param callback Called with the keystroke that started typing.
 * @param options `document`, `isTypedCharValid`, `isFocusedElementEditable`.
 * @example
 * ```ts
 * let hintVisible = $state(false);
 * onStartTyping(() => (hintVisible = true));
 * ```
 */
export function onStartTyping(
	callback: (event: KeyboardEvent) => void,
	options: OnStartTypingOptions = {}
): void {
	const {
		isTypedCharValid: isTypedCharValidFn = isTypedCharValid,
		isFocusedElementEditable: isFocusedElementEditableFn = isFocusedElementEditable
	} = options;

	useEventListener(
		() =>
			options.document === undefined
				? isBrowser
					? document
					: null
				: resolveGetter(options.document),
		'keydown',
		(event) => {
			if (!isFocusedElementEditableFn() && isTypedCharValidFn(event)) {
				callback(event);
			}
		},
		{ passive: true }
	);
}
