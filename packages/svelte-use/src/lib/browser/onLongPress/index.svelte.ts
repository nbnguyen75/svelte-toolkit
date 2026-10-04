import type { MaybeHTMLElement } from '../../shared/element.ts';
import type { MaybeGetter } from '../../shared/getter.ts';

import { resolveGetter } from '../../shared/getter.ts';
import { noop } from '../../shared/is.ts';

/** Milliseconds a press must last before the handler runs. */
const DEFAULT_DELAY = 500;

/** Pixels the pointer may drift before the press is abandoned. */
const DEFAULT_THRESHOLD = 10;

/** Listener flags for {@link OnLongPressModifiers}. */
export interface OnLongPressModifiers {
	/** `preventDefault` on the pointer events this util handles. @default false */
	prevent?: boolean | undefined;
	/** Listen in the capture phase. @default false */
	capture?: boolean | undefined;
	/** Stop propagation on the pointer events this util handles. @default false */
	stop?: boolean | undefined;
	/**
	 * Run the handler at most once, ever. Unlike VueUse's version this survives
	 * a press that was abandoned for drifting too far: a native `once` listener
	 * is removed the moment it fires, which would leave the element deaf to
	 * every later press.
	 * @default false
	 */
	once?: boolean | undefined;
	/** Only react to presses whose `target` is the element itself. @default false */
	self?: boolean | undefined;
}

/**
 * Options for {@link onLongPress}.
 *
 * Every property accepts `undefined`, so an uninitialised Svelte
 * `let delay = $state<number>()` forwards straight through.
 */
export interface OnLongPressOptions {
	/**
	 * Called on release, however the press ended - including a press abandoned
	 * for drifting too far, which reports `isLongPress: false` (VueUse's version
	 * stays silent in that case, so a caller waiting for the release never hears
	 * back when the user drags off).
	 * @param duration How long the element was held, in ms.
	 * @param distance How far the pointer drifted from where it went down.
	 * @param isLongPress Whether the handler had already run for this press.
	 * @param event The `pointerup` / `pointerleave` / `pointercancel` event.
	 */
	onMouseUp?:
		| ((duration: number, distance: number, isLongPress: boolean, event: PointerEvent) => void)
		| undefined;
	/**
	 * How long the press must last, in ms, or a function of the `pointerdown`
	 * that decides it per press.
	 * @default 500
	 */
	delay?: number | ((event: PointerEvent) => number) | undefined;
	/**
	 * How far the pointer may drift in pixels before the press is abandoned, or
	 * `false` to allow any movement.
	 * @default 10
	 */
	distanceThreshold?: number | false | undefined;
	/** Listener flags: `stop`, `once`, `prevent`, `capture`, `self`. */
	modifiers?: OnLongPressModifiers | undefined;
}

/** Detaches the listeners and cancels a press in flight. */
export type OnLongPressReturn = () => void;

/** Where a press started. */
interface PressStart {
	x: number;
	y: number;
}

/**
 * Call a handler when an element is pressed and held.
 *
 * The handler receives the `pointerdown` event that started the press, not a
 * timer event - by the time the delay elapses, that is the event that explains
 * why anything is happening.
 *
 * @param target Element to listen on, or a getter for it.
 * @param handler Called once the press outlasts `delay`.
 * @param options `delay`, `distanceThreshold`, `modifiers`, `onMouseUp`.
 * @returns A function that detaches the listeners.
 * @example
 * ```ts
 * const stop = onLongPress(() => tile, () => openMenu(), { delay: 700 });
 * ```
 */
export function onLongPress(
	target: MaybeGetter<MaybeHTMLElement>,
	handler: (event: PointerEvent) => void,
	options: OnLongPressOptions = {}
): OnLongPressReturn {
	const {
		delay = DEFAULT_DELAY,
		distanceThreshold = DEFAULT_THRESHOLD,
		modifiers = {},
		onMouseUp
	} = options;

	// Plain variables: this is a state machine, not reactive state, and nothing
	// renders from any of it.
	let timeout: ReturnType<typeof setTimeout> | undefined;
	let start: PressStart | undefined;
	let startTimestamp: number | undefined;
	let hasLongPressed = false;
	// Never cleared - `once` means once for the life of the listener, not once per press.
	let fired = false;

	function cancelTimer() {
		if (timeout !== undefined) clearTimeout(timeout);
		timeout = undefined;
		hasLongPressed = false;
	}

	function clear() {
		cancelTimer();
		start = undefined;
		startTimestamp = undefined;
	}

	function applyModifiers(event: PointerEvent) {
		if (modifiers.prevent) event.preventDefault();
		if (modifiers.stop) event.stopPropagation();
	}

	function isSelf(event: PointerEvent): boolean {
		return !!modifiers.self && event.target !== resolveGetter(target);
	}

	function onDown(event: PointerEvent) {
		// `once` is the only thing `fired` gates, so a normal press does not
		// disable the next one.
		if ((modifiers.once && fired) || isSelf(event)) return;

		clear();
		applyModifiers(event);

		start = { x: event.x, y: event.y };
		startTimestamp = event.timeStamp;
		timeout = setTimeout(
			() => {
				hasLongPressed = true;
				fired = true;
				handler(event);
			},
			typeof delay === 'function' ? delay(event) : delay
		);
	}

	function onMove(event: PointerEvent) {
		if (isSelf(event) || !start || distanceThreshold === false) return;
		applyModifiers(event);
		// Beyond the threshold this is a drag, not a press: drop the pending
		// timer, but keep the start position so the release can still be reported.
		if (distance(event, start) >= distanceThreshold) cancelTimer();
	}

	function onRelease(event: PointerEvent) {
		// Read before clearing: the report needs the state the press ended with.
		const [releasedAt, pressedAt, wasLongPress] = [startTimestamp, start, hasLongPressed];
		clear();

		if (!onMouseUp || !pressedAt || releasedAt === undefined || isSelf(event)) return;
		applyModifiers(event);

		onMouseUp(event.timeStamp - releasedAt, distance(event, pressedAt), wasLongPress, event);
	}

	function bind(el: HTMLElement): () => void {
		// One options object for both directions: `removeEventListener` matches
		// on `capture` alone, but only if it is the same value.
		const listenerOptions: AddEventListenerOptions = { capture: modifiers.capture ?? false };
		el.addEventListener('pointerdown', onDown, listenerOptions);
		el.addEventListener('pointermove', onMove, listenerOptions);
		el.addEventListener('pointerup', onRelease, listenerOptions);
		el.addEventListener('pointerleave', onRelease, listenerOptions);
		el.addEventListener('pointercancel', onRelease, listenerOptions);
		return () => {
			el.removeEventListener('pointerdown', onDown, listenerOptions);
			el.removeEventListener('pointermove', onMove, listenerOptions);
			el.removeEventListener('pointerup', onRelease, listenerOptions);
			el.removeEventListener('pointerleave', onRelease, listenerOptions);
			el.removeEventListener('pointercancel', onRelease, listenerOptions);
			clear();
		};
	}

	// The effect exists for its lifecycle, not for tracking the target's
	// identity: `detach` is what `stop()` reuses, so there is one binding block
	// and one unbinding block for both teardown routes.
	let stopped = false;
	let detach: (() => void) | undefined;

	$effect(() => {
		// Always returns a cleanup: a bare `return` trips `consistent-return`.
		const el = resolveGetter(target);
		if (!el || stopped) return noop;
		detach = bind(el);
		return () => {
			detach?.();
			detach = undefined;
		};
	});

	return () => {
		stopped = true;
		detach?.();
		detach = undefined;
	};
}

function distance(event: PointerEvent, from: PressStart): number {
	const dx = event.x - from.x;
	const dy = event.y - from.y;
	return Math.hypot(dx, dy);
}
