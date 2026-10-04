import type { MaybeGetter } from '../../shared/getter.ts';

import { resolveGetter } from '../../shared/getter.ts';
import { isPointerEvent, isBrowser } from '../../shared/is.ts';
import { useEventListener } from '../useEventListener/index.svelte.ts';

/** Everything {@link usePointer} reads off a pointer event. */
export interface UsePointerState {
	/**
	 * `null` until the first pointer event, then whatever the platform reported.
	 *
	 * Typed as `string` rather than `'mouse' | 'pen' | 'touch'` on purpose: the
	 * DOM types `pointerType` as `string` because a device is free to report a
	 * name of its own, and VueUse's union only holds because it casts. Widening
	 * here means a caller can filter on a custom kind without a cast of their
	 * own.
	 */
	pointerType: string | null;
	pointerId: number;
	/** `0` for a pointer that is not pressing, `0.5` for a mouse button, `1` for full contact. */
	pressure: number;
	/** Contact geometry height, in CSS pixels. `1` for a mouse. */
	height: number;
	/** Tilt from the X axis, in degrees. */
	tiltX: number;
	/** Tilt from the Y axis, in degrees. */
	tiltY: number;
	/** Contact geometry width, in CSS pixels. `1` for a mouse. */
	width: number;
	/** Barrel rotation, in degrees. */
	twist: number;
	/** Client/viewport x, the `x` of `MouseEvent` and not `clientX`. */
	x: number;
	/** Client/viewport y. */
	y: number;
}

/** Options for {@link usePointer}. */
export interface UsePointerOptions {
	/**
	 * Pointer kinds to report, e.g. `['pen']`. Every kind is reported when this
	 * is unset - VueUse documents a default of `['mouse', 'touch', 'pen']` but
	 * ships no filter, and a port that filtered by default would drop events.
	 *
	 * Read on every event, so a getter takes effect immediately.
	 */
	pointerTypes?: MaybeGetter<readonly string[] | undefined>;
	/**
	 * Where to listen. Defaults to `window`.
	 *
	 * Unlike `useDraggable`, a named target that resolves to nullish binds
	 * nothing rather than falling back to `window` - widening the scope silently
	 * would report a pointer the caller never asked about. See the README.
	 */
	target?: MaybeGetter<EventTarget | null | undefined>;
	/**
	 * Field overrides for the first read, merged over the zero state.
	 *
	 * Read once, not per event: the state is overwritten by the first pointer
	 * event, so this only decides what is reported before one arrives.
	 */
	initialValue?: Partial<UsePointerState>;
}

/** Reactive pointer state returned by {@link usePointer}. */
export interface UsePointerReturn extends UsePointerState {
	/**
	 * Whether the target has seen a pointer event that has not since been
	 * followed by a `pointerleave` or `pointercancel`.
	 *
	 * Set before the `pointerTypes` filter, so a filtered-out pointer still
	 * counts as inside. VueUse orders it the same way.
	 */
	readonly isInside: boolean;
}

/**
 * Module-scope immutable constant, safe to evaluate during SSR (`scope.md` §2).
 * The events never call `preventDefault`, so `passive` is constant and there is
 * no reason to re-bind when an option changes.
 */
const LISTENER_OPTIONS: AddEventListenerOptions = { passive: true };

/** The state before any pointer event has been seen. */
const ZERO: UsePointerState = {
	x: 0,
	y: 0,
	pointerId: 0,
	pressure: 0,
	tiltX: 0,
	tiltY: 0,
	width: 0,
	height: 0,
	twist: 0,
	pointerType: null
};

/**
 * Reactive pointer state: position, pressure, tilt, contact geometry, and
 * whether the pointer is inside the target. Must be called in component
 * initialization (uses `$state` / `$effect`).
 *
 * @param options `pointerTypes`, `initialValue`, `target`.
 * @returns Getter-backed `x`, `y`, `pressure`, `pointerId`, `tiltX`, `tiltY`,
 * `width`, `height`, `twist`, `pointerType`, and `isInside`.
 * @example
 * ```ts
 * const pointer = usePointer();
 * ```
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { usePointer } from '@wynn-dev/svelte-use';
 *
 *   const pointer = usePointer({ pointerTypes: ['pen'] });
 * </script>
 *
 * <p>Pressure: {pointer.pressure}</p>
 * ```
 */
export function usePointer(options: UsePointerOptions = {}): UsePointerReturn {
	// Replaced wholesale on every reported event, never mutated, so `raw` is the
	// honest wrapper: reading the variable is the whole dependency.
	let state = $state.raw<UsePointerState>({ ...ZERO, ...resolveGetter(options.initialValue) });
	let isInside = $state(false);

	/** Whether the caller named a target, as opposed to falling back to `window`. */
	const named = options.target !== undefined;

	function record(event: Event): void {
		isInside = true;
		if (!isPointerEvent(event)) return;
		// Compared with `includes` against the event's own `string`, so a custom
		// pointer kind is filterable without asserting it into a union first.
		const types = resolveGetter(options.pointerTypes);
		if (types && !types.includes(event.pointerType)) return;
		state = {
			x: event.x,
			y: event.y,
			pointerId: event.pointerId,
			pressure: event.pressure,
			tiltX: event.tiltX,
			tiltY: event.tiltY,
			width: event.width,
			height: event.height,
			twist: event.twist,
			pointerType: event.pointerType
		};
	}

	/** A leave or a cancel clears the flag but keeps the last known state. */
	function leave(): void {
		isInside = false;
	}

	function listenTarget(): EventTarget | null | undefined {
		if (!isBrowser) return null;
		return named ? resolveGetter(options.target) : window;
	}

	useEventListener(listenTarget, 'pointerdown', record, LISTENER_OPTIONS);
	useEventListener(listenTarget, 'pointermove', record, LISTENER_OPTIONS);
	useEventListener(listenTarget, 'pointerup', record, LISTENER_OPTIONS);
	useEventListener(listenTarget, 'pointerleave', leave, LISTENER_OPTIONS);
	useEventListener(listenTarget, 'pointercancel', leave, LISTENER_OPTIONS);

	return {
		get x() {
			return state.x;
		},
		get y() {
			return state.y;
		},
		get pointerId() {
			return state.pointerId;
		},
		get pressure() {
			return state.pressure;
		},
		get tiltX() {
			return state.tiltX;
		},
		get tiltY() {
			return state.tiltY;
		},
		get width() {
			return state.width;
		},
		get height() {
			return state.height;
		},
		get twist() {
			return state.twist;
		},
		get pointerType() {
			return state.pointerType;
		},
		get isInside() {
			return isInside;
		}
	};
}
