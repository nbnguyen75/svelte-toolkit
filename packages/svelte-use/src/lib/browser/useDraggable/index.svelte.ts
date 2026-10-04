import type { MaybeElement } from '../../shared/element.ts';
import type { MaybeGetter } from '../../shared/getter.ts';

import { resolveGetter } from '../../shared/getter.ts';
import { isPointerEvent, isBrowser, noop } from '../../shared/is.ts';

/** A point in pixels. */
export interface Position {
	x: number;
	y: number;
}

/** Pointer kinds a drag can be limited to. */
export type DragPointerType = 'mouse' | 'pen' | 'touch';

/** Axes a drag is allowed along. */
export type DragAxis = 'x' | 'y' | 'both';

/**
 * Options for {@link useDraggable}.
 *
 * Every property accepts `undefined`, so an uninitialised Svelte
 * `let disabled = $state<boolean>()` forwards straight through.
 */
export interface UseDraggableOptions {
	/**
	 * Called when the drag starts. Return `false` to refuse it.
	 *
	 * @param position The press, resolved against the container.
	 * @param event The `pointerdown` that started it.
	 */
	onStart?: ((position: Position, event: PointerEvent) => void | false) | undefined;
	/**
	 * Where `pointermove`, `pointerup`, and `pointercancel` are heard. `window` by
	 * default, which is what keeps a drag alive when the pointer leaves the
	 * element - pointer events are captured to the press target on their own, so
	 * that needs no special handling.
	 * @default window
	 */
	draggingElement?: MaybeGetter<EventTarget | null | undefined> | undefined;
	/**
	 * Called on every move of the drag.
	 *
	 * @param position Where the element now is.
	 * @param event The `pointermove` that moved it.
	 */
	onMove?: ((position: Position, event: PointerEvent) => void) | undefined;
	/**
	 * Called when the drag ends.
	 *
	 * @param position Where the element ended up.
	 * @param event The `pointerup` / `pointercancel` that ended it.
	 */
	onEnd?: ((position: Position, event: PointerEvent) => void) | undefined;
	/** `stopPropagation` on the pointer events this util handles. @default false */
	stopPropagation?: MaybeGetter<boolean | undefined> | undefined;
	/** `preventDefault` on the pointer events this util handles. @default false */
	preventDefault?: MaybeGetter<boolean | undefined> | undefined;
	/**
	 * Keep the element inside the container's *visible* area, rather than merely
	 * inside its scroll area.
	 * @default false
	 */
	restrictInView?: MaybeGetter<boolean | undefined> | undefined;
	/**
	 * Element the drag is measured against, so `position` is relative to it
	 * rather than to the viewport. Dragging is clamped to its scroll area.
	 * @default undefined
	 */
	containerElement?: MaybeGetter<MaybeElement> | undefined;
	/** Refuse every press. @default false */
	disabled?: MaybeGetter<boolean | undefined> | undefined;
	/**
	 * Mouse buttons that may start a drag: `0` main, `1` auxiliary, `2`
	 * secondary.
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button#value
	 * @default [0]
	 */
	buttons?: MaybeGetter<number[] | undefined> | undefined;
	/**
	 * Only start the drag when the press lands on the target itself, not on a
	 * descendant.
	 * @default false
	 */
	exact?: MaybeGetter<boolean | undefined> | undefined;
	/**
	 * Element whose press starts the drag, when it is not the dragged element
	 * itself - the grip in the corner of a card.
	 * @default target
	 */
	handle?: MaybeGetter<MaybeElement> | undefined;
	/**
	 * Pointer kinds that may drag.
	 * @default undefined (all of them)
	 */
	pointerTypes?: DragPointerType[] | undefined;
	/** Where the element starts. @default { x: 0, y: 0 } */
	initialValue?: Position | undefined;
	/**
	 * Listen in the capture phase, so a handler that calls `stopPropagation`
	 * cannot hide the drag from this util.
	 * @default true
	 */
	capture?: boolean | undefined;
	/**
	 * Axis to drag on.
	 * @default 'both'
	 */
	axis?: DragAxis | undefined;
}

/** Reactive position and state of {@link useDraggable}. */
export interface UseDraggableReturn {
	/** Whether a press is in progress. */
	readonly isDragging: boolean;
	/** Both offsets. Mutating it moves the element. */
	readonly position: Position;
	/** `left` / `top` declaration for the current position. */
	readonly style: string;
	/** Horizontal offset, in pixels. */
	readonly x: number;
	/** Vertical offset, in pixels. */
	readonly y: number;
}

/** Keeps a container that has been scrolled past its content from staying there. */
function clampContainerScroll(container: Element): void {
	if (container.scrollLeft > container.scrollWidth - container.clientWidth)
		container.scrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
	if (container.scrollTop > container.scrollHeight - container.clientHeight)
		container.scrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
}

/**
 * Attach and detach by hand rather than through `useEventListener`, for one
 * reason: `passive` is fixed when a listener is bound, so it has to be read
 * inside the effect that owns the binding or `preventDefault` would stop working
 * the moment it was switched on.
 */
function bind(
	target: EventTarget,
	type: string,
	handler: (event: Event) => void,
	options: AddEventListenerOptions
): () => void {
	target.addEventListener(type, handler, options);
	return () => target.removeEventListener(type, handler, options);
}

/**
 * Make an element draggable.
 *
 * The press is heard on the target (or `handle`), the drag on `draggingElement`,
 * which defaults to `window` so a drag survives the pointer leaving the
 * element. `position` is the offset from where the element already is, so
 * binding it as a style moves the element with no layout bookkeeping.
 *
 * @param target Element to drag, or a getter for it.
 * @param options See {@link UseDraggableOptions}.
 * @returns `x`, `y`, `position`, `isDragging`, `style`.
 * @example
 * ```ts
 * const drag = useDraggable(() => card, { axis: 'y' });
 * ```
 */
export function useDraggable(
	target: MaybeGetter<MaybeElement>,
	options: UseDraggableOptions = {}
): UseDraggableReturn {
	const {
		exact,
		preventDefault,
		stopPropagation,
		capture = true,
		draggingElement,
		containerElement,
		handle,
		pointerTypes,
		initialValue,
		onStart,
		onMove,
		onEnd,
		axis = 'both',
		disabled,
		buttons,
		restrictInView
	} = options;

	let position = $state<Position>({ x: initialValue?.x ?? 0, y: initialValue?.y ?? 0 });
	// Reactive because `isDragging` is, and a press that ends somewhere else
	// still has to be visible to whatever reports it.
	let pressedDelta = $state<Position | undefined>(undefined);

	function filterEvent(event: PointerEvent): boolean {
		// Compared rather than `includes`, so `pointerType` - typed as `string` -
		// needs no assertion.
		return pointerTypes ? pointerTypes.some((type) => type === event.pointerType) : true;
	}

	function handleEvent(event: PointerEvent): void {
		if (resolveGetter(preventDefault)) event.preventDefault();
		if (resolveGetter(stopPropagation)) event.stopPropagation();
	}

	function start(event: Event): void {
		if (!isPointerEvent(event)) return;
		if (!(resolveGetter(buttons) ?? [0]).includes(event.button)) return;
		if (resolveGetter(disabled) || !filterEvent(event)) return;

		const el = resolveGetter(target);
		if (!el) return;
		if (resolveGetter(exact) && event.target !== el) return;

		const container = resolveGetter(containerElement);
		const containerRect = container?.getBoundingClientRect();
		const targetRect = el.getBoundingClientRect();
		// Where the press landed, in the coordinates `position` is reported in:
		// offset from the container's visible corner, plus wherever it is scrolled.
		const originX = containerRect
			? targetRect.left - containerRect.left + (container?.scrollLeft ?? 0)
			: targetRect.left;
		const originY = containerRect
			? targetRect.top - containerRect.top + (container?.scrollTop ?? 0)
			: targetRect.top;

		const pressed = { x: event.clientX - originX, y: event.clientY - originY };
		if (onStart?.(pressed, event) === false) return;

		pressedDelta = pressed;
		handleEvent(event);
	}

	function move(event: Event): void {
		if (!isPointerEvent(event)) return;
		if (resolveGetter(disabled) || !filterEvent(event) || !pressedDelta) return;

		const el = resolveGetter(target);
		if (!el) return;

		const container = resolveGetter(containerElement);
		if (container) clampContainerScroll(container);

		const targetRect = el.getBoundingClientRect();
		let { x, y } = position;

		if (axis !== 'y') {
			x = event.clientX - pressedDelta.x;
			if (container) x = Math.min(Math.max(0, x), container.scrollWidth - targetRect.width);
		}
		if (axis !== 'x') {
			y = event.clientY - pressedDelta.y;
			if (container) y = Math.min(Math.max(0, y), container.scrollHeight - targetRect.height);
		}

		// Those clamps use `scrollWidth`, so they allow the element anywhere in the
		// content - off the visible edge included. This is the one that keeps it
		// on screen.
		if (container && resolveGetter(restrictInView)) {
			if (axis !== 'y')
				x = Math.min(
					Math.max(container.scrollLeft, x),
					container.clientWidth - targetRect.width + container.scrollLeft
				);
			if (axis !== 'x')
				y = Math.min(
					Math.max(container.scrollTop, y),
					container.clientHeight - targetRect.height + container.scrollTop
				);
		}

		position = { x, y };
		onMove?.(position, event);
		handleEvent(event);
	}

	function end(event: Event): void {
		if (!isPointerEvent(event)) return;
		if (resolveGetter(disabled) || !filterEvent(event) || !pressedDelta) return;

		pressedDelta = undefined;
		onEnd?.(position, event);
		handleEvent(event);
	}

	/** `window` unless the caller named somewhere else, resolved lazily for SSR. */
	function dragTarget(): EventTarget | null {
		return resolveGetter(draggingElement) ?? (isBrowser ? window : null);
	}

	$effect(() => {
		// One effect for all four listeners: they share a lifetime, and four
		// effects would re-bind one of them whenever a single target changed.
		const pressTarget = resolveGetter(handle ?? target);
		const moveTarget = dragTarget();
		// Always returns cleanups: a bare `return` trips `consistent-return`.
		if (!pressTarget || !moveTarget) return noop;

		// One options object for both directions: `removeEventListener` matches
		// on `capture` alone, but only if it is the same value.
		const listenerOptions: AddEventListenerOptions = {
			capture,
			passive: !resolveGetter(preventDefault)
		};
		const detachers = [
			bind(pressTarget, 'pointerdown', start, listenerOptions),
			bind(moveTarget, 'pointermove', move, listenerOptions),
			bind(moveTarget, 'pointerup', end, listenerOptions),
			bind(moveTarget, 'pointercancel', end, listenerOptions)
		];
		return () => {
			for (const detach of detachers) detach();
		};
	});

	return {
		get x() {
			return position.x;
		},
		get y() {
			return position.y;
		},
		get position() {
			return position;
		},
		get isDragging() {
			return pressedDelta !== undefined;
		},
		get style() {
			return `left: ${position.x}px; top: ${position.y}px;`;
		}
	};
}
