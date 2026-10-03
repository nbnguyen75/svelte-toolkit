import type { MaybeGetter } from '../../shared/getter.ts';
import type { UseMouseSourceType } from '../useMouse/index.ts';

import { resolveGetter } from '../../shared/getter.ts';
import { isBrowser } from '../../shared/is.ts';
import { useEventListener } from '../useEventListener/index.svelte.ts';

/** Any event that can mark a press as started or finished. */
export type UseMousePressedEvent = MouseEvent | TouchEvent | DragEvent;

/** Element the press starts on. Release events always come from the window. */
export type UseMousePressedTarget = EventTarget | null | undefined;

/** Options for {@link useMousePressed}. */
export interface UseMousePressedOptions {
	/**
	 * Called when the press ends, before `pressed` is observed as `false`.
	 */
	onReleased?: (event: UseMousePressedEvent) => void;
	/**
	 * Called when a press starts, before `pressed` is observed as `true`.
	 */
	onPressed?: (event: UseMousePressedEvent) => void;
	/**
	 * Element the press starts on. Falls back to `window`.
	 * @default () => (isBrowser ? window : undefined)
	 */
	target?: MaybeGetter<UseMousePressedTarget>;
	/**
	 * Starting value.
	 * @default false
	 */
	initialValue?: boolean;
	/**
	 * Attach the listeners with `capture: true`.
	 * @default false
	 */
	capture?: boolean;
	/**
	 * Listen for `touchstart` and release on `touchend` / `touchcancel`.
	 * @default true
	 */
	touch?: boolean;
	/**
	 * Listen for `dragstart` and release on `drop` / `dragend`.
	 * @default true
	 */
	drag?: boolean;
}

/** Reactive press state returned by {@link useMousePressed}. */
export interface UseMousePressedReturn {
	/** Which device started the press, or `null` while released. */
	readonly sourceType: UseMouseSourceType;
	/** True from a press event until a release event. */
	readonly pressed: boolean;
}

/**
 * `useEventListener`'s generic overload hands back a plain `Event`, but the DOM
 * guarantees the concrete type for a given event name — `mousedown` is always a
 * `MouseEvent`, `touchstart` always a `TouchEvent`, `dragstart` always a
 * `DragEvent`.
 *
 * Recovering that needs either an assertion or a predicate, and both are suspect
 * on their own: `in` narrowing adds the key to the type without the rest of the
 * interface, and `instanceof` is banned for being cross-realm unsafe. A predicate
 * keeps the narrowing honest at the one place the event name guarantees it, and
 * the three distinguishing properties are all present on exactly one of the
 * three event types.
 */
function isPressEvent(event: Event): event is UseMousePressedEvent {
	return 'clientX' in event || 'touches' in event || 'dataTransfer' in event;
}

/**
 * Release events are watched on the window. A getter, not a captured `window`, so
 * setup never reads `window` during SSR.
 */
const windowTarget = (): UseMousePressedTarget => (isBrowser ? window : undefined);

/**
 * Reactive press state, driven by mouse, touch, and HTML5 drag. Must be called
 * in component initialization (uses `$state` / `$effect`).
 *
 * Press events come from the target, but release events come from the window —
 * a press that ends outside the element, or outside the browser entirely, still
 * has to clear the state.
 *
 * @param options `touch`, `drag`, `capture`, `initialValue`, `target`, `onPressed`, `onReleased`.
 * @returns Getter-backed `pressed` and `sourceType`.
 * @example
 * ```ts
 * const { pressed, sourceType } = useMousePressed({ target: () => button });
 *
 * console.log(pressed, sourceType); // true, 'mouse'
 * ```
 */
export function useMousePressed(options: UseMousePressedOptions = {}): UseMousePressedReturn {
	const { touch = true, drag = true, capture = false, initialValue = false } = options;

	let pressed = $state(initialValue);
	let sourceType = $state<UseMouseSourceType>(null);

	/**
	 * The callback runs before `pressed` flips, so a caller reading it still sees
	 * the previous value. That is VueUse's order and it is the useful one: a
	 * press callback that must measure a still-unpressed element gets one.
	 */
	function onPressed(srcType: Exclude<UseMouseSourceType, null>) {
		return (event: Event): void => {
			if (!isPressEvent(event)) return;
			options.onPressed?.(event);
			pressed = true;
			sourceType = srcType;
		};
	}

	function onReleased(event: Event): void {
		if (!isPressEvent(event)) return;
		options.onReleased?.(event);
		pressed = false;
		sourceType = null;
	}

	const passive = { passive: true, capture };
	// A getter, not a captured `window`, so setup never reads `window` during
	// SSR and a swapped element is picked up without re-mounting.
	const target = (): UseMousePressedTarget =>
		options.target === undefined ? (isBrowser ? window : undefined) : resolveGetter(options.target);

	useEventListener(target, 'mousedown', onPressed('mouse'), passive);
	useEventListener(windowTarget, 'mouseleave', onReleased, passive);
	useEventListener(windowTarget, 'mouseup', onReleased, passive);

	if (drag) {
		useEventListener(target, 'dragstart', onPressed('mouse'), passive);
		useEventListener(windowTarget, 'drop', onReleased, passive);
		useEventListener(windowTarget, 'dragend', onReleased, passive);
	}

	if (touch) {
		useEventListener(target, 'touchstart', onPressed('touch'), passive);
		useEventListener(windowTarget, 'touchend', onReleased, passive);
		useEventListener(windowTarget, 'touchcancel', onReleased, passive);
	}

	return {
		get pressed() {
			return pressed;
		},
		get sourceType() {
			return sourceType;
		}
	};
}
