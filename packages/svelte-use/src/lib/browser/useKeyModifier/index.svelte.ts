import type { MaybeGetter } from '../../shared/getter.ts';

import { resolveGetter } from '../../shared/getter.ts';
import { isBrowser } from '../../shared/is.ts';
import { useEventListener } from '../useEventListener/index.svelte.ts';

/** A modifier key whose pressed state can be tracked. */
export type KeyModifier =
	| 'Alt'
	| 'AltGraph'
	| 'CapsLock'
	| 'Control'
	| 'Fn'
	| 'FnLock'
	| 'Meta'
	| 'NumLock'
	| 'ScrollLock'
	| 'Shift'
	| 'Symbol'
	| 'SymbolLock';

/** Options for {@link useKeyModifier}. */
export interface UseKeyModifierOptions {
	/** Document to listen on. `document` by default. */
	document?: MaybeGetter<Document | null | undefined>;
	/**
	 * Events that re-read the modifier state.
	 * @default ['mousedown', 'mouseup', 'keydown', 'keyup']
	 */
	events?: readonly string[];
	/**
	 * Reported before the first event. `null` means "unknown", which is honest:
	 * nothing has told us yet whether the key is down.
	 * @default null
	 */
	initial?: boolean | null;
}

/** Getter-backed pressed state. */
export interface UseKeyModifierReturn {
	/** `true` while held, `false` while not, `null` before any event. */
	readonly value: boolean | null;
}

/**
 * VueUse's four default events. Module-scope immutable constant, so it is safe to
 * share across requests under `scope.md` §2.
 */
const DEFAULT_EVENTS: readonly string[] = ['mousedown', 'mouseup', 'keydown', 'keyup'];

/**
 * `MouseEvent` and `KeyboardEvent` both expose `getModifierState`; plain `Event`
 * does not. Probed rather than cast, per the repo's ban on `instanceof`/assertions.
 */
function hasModifierState(event: Event): event is KeyboardEvent | MouseEvent {
	return 'getModifierState' in event;
}

/**
 * Track whether a modifier key (Shift, Control, Alt, Meta, CapsLock, …) is
 * pressed. Must be called in component initialization — the listeners attach in
 * an `$effect` and detach on unmount. Reports `null` on the server and until the
 * first relevant event.
 *
 * @param modifier Modifier to track, e.g. `'Shift'`.
 * @param options `events`, `initial`, `document`.
 * @example
 * ```ts
 * const shift = useKeyModifier('Shift');
 * const style = $derived(shift.value ? 'uppercase' : 'none');
 * ```
 */
export function useKeyModifier(
	modifier: KeyModifier,
	options: UseKeyModifierOptions = {}
): UseKeyModifierReturn {
	const { events = DEFAULT_EVENTS, initial = null } = options;

	let pressed = $state<boolean | null>(initial);

	const target = () =>
		options.document === undefined
			? isBrowser
				? document
				: null
			: resolveGetter(options.document);

	const listener = (event: Event) => {
		if (hasModifierState(event)) {
			pressed = event.getModifierState(modifier);
		}
	};

	// One listener per event name. `events` is a plain array, not a getter, so
	// this loop runs once per call rather than per effect run.
	for (const name of events) {
		useEventListener(target, name, listener, { passive: true });
	}

	return {
		get value() {
			return pressed;
		}
	};
}
