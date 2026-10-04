/**
 * Pointer event factory for jsdom.
 *
 * jsdom implements `MouseEvent` but not `PointerEvent`, and the gesture utils
 * read pointer-only fields (`x`/`y`, `pointerId`, `pointerType`, `pressure`).
 * Building them on `MouseEvent` keeps the real propagation path - capture,
 * bubbling, `composedPath()` - so tests exercise the same listener wiring a
 * browser would.
 */
export interface PointerInit {
	/** Client/viewport x, also mirrored to `x`. */
	x?: number;
	/** Client/viewport y, also mirrored to `y`. */
	y?: number;
	pointerId?: number;
	pointerType?: string;
	pressure?: number;
	/** `0` marks a keyboard-synthesised click, as the platform reports it. */
	detail?: number;
	isPrimary?: boolean;
	button?: number;
	buttons?: number;
}

/**
 * A `PointerEvent`-shaped `MouseEvent`. Dispatch it on an element or on `window`
 * rather than returning it for inspection.
 */
export function pointerEvent(type: string, init: PointerInit = {}): PointerEvent {
	const { x = 0, y = 0, button = 0, buttons = 0 } = init;
	const event = new MouseEvent(type, {
		bubbles: true,
		cancelable: true,
		clientX: x,
		clientY: y,
		button,
		buttons,
		detail: init.detail ?? 1
	});
	// The pointer-only half of the interface, which `MouseEvent` does not carry.
	// `x`/`y` are defined rather than assigned because they are getters on the
	// prototype chain in jsdom.
	Object.defineProperties(event, {
		x: { value: x, configurable: true },
		y: { value: y, configurable: true },
		pointerId: { value: init.pointerId ?? 1, configurable: true },
		pointerType: { value: init.pointerType ?? 'mouse', configurable: true },
		pressure: { value: init.pressure ?? (buttons ? 0.5 : 0), configurable: true },
		isPrimary: { value: init.isPrimary ?? true, configurable: true }
	});
	return event as PointerEvent;
}
