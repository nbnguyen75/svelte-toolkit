/**
 * Pointer, touch, and drag event factories for jsdom.
 *
 * jsdom implements `MouseEvent` but not `PointerEvent`, and the gesture utils
 * read pointer-only fields (`x`/`y`, `pointerId`, `pointerType`, `pressure`).
 * Building them on `MouseEvent` keeps the real propagation path - capture,
 * bubbling, `composedPath()` - so tests exercise the same listener wiring a
 * browser would. `DragEvent` and `DataTransfer` are missing from jsdom outright,
 * so those get the same treatment plus a structural `dataTransfer`.
 */
export interface PointerInit {
	/** Client/viewport x, also mirrored to `x`. */
	x?: number;
	/** Client/viewport y, also mirrored to `y`. */
	y?: number;
	pointerId?: number;
	pointerType?: string;
	pressure?: number;
	/** Tilt from the X axis, in degrees. */
	tiltX?: number;
	/** Tilt from the Y axis, in degrees. */
	tiltY?: number;
	/** Contact geometry width, in CSS pixels. `1` is what a mouse reports. */
	width?: number;
	/** Contact geometry height, in CSS pixels. `1` is what a mouse reports. */
	height?: number;
	/** Barrel rotation, in degrees. */
	twist?: number;
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
		tiltX: { value: init.tiltX ?? 0, configurable: true },
		tiltY: { value: init.tiltY ?? 0, configurable: true },
		width: { value: init.width ?? 1, configurable: true },
		height: { value: init.height ?? 1, configurable: true },
		twist: { value: init.twist ?? 0, configurable: true },
		isPrimary: { value: init.isPrimary ?? true, configurable: true }
	});
	return event as PointerEvent;
}

/** A point in client/page/screen space, which is all `useSwipe` reads. */
export interface TouchCoords {
	clientX: number;
	clientY: number;
	pageX?: number;
	pageY?: number;
}

/**
 * A `TouchEvent` carrying `touches`.
 *
 * jsdom ships the `TouchEvent` constructor but no `Touch` one, so a touch is a
 * coordinate bag. Pass an empty array for "no finger down" — `touchcancel` and
 * the empty-`touches` cases both need it.
 */
export function touchEvent(
	type: string,
	touches: TouchCoords[] = [{ clientX: 0, clientY: 0 }]
): TouchEvent {
	const event = new TouchEvent(type, { bubbles: true, cancelable: true });
	Object.defineProperty(event, 'touches', {
		value: touches.map((coords) => ({
			identifier: 0,
			target: document.body,
			clientX: coords.clientX,
			clientY: coords.clientY,
			pageX: coords.pageX ?? coords.clientX,
			pageY: coords.pageY ?? coords.clientY,
			screenX: coords.clientX,
			screenY: coords.clientY
		})),
		configurable: true
	});
	return event;
}

/** A dropped file. Name plus MIME type is all a drop zone inspects. */
export function dropFile(name: string, type = 'text/plain'): File {
	return new File(['dropped'], name, { type });
}

export interface DragInit {
	/** Dropped files. `items` is derived from them, one item per file. */
	files?: File[];
	/**
	 * Item MIME types, when they should not follow the files. Safari exposes
	 * `items` but not `files` mid-drag, and that is the case this exists for.
	 */
	types?: readonly string[];
	/** Omit `dataTransfer` entirely, as a drag of in-page data may. */
	withoutDataTransfer?: boolean;
}

/**
 * A `DragEvent` carrying `dataTransfer`.
 *
 * jsdom implements `File` but neither `DragEvent` nor `DataTransfer`, so this is a
 * `MouseEvent` with a `dataTransfer` bolted on - the same shape as
 * {@link pointerEvent}, for the same reason. Dispatch it rather than returning
 * it for inspection: `dropEffect` is only meaningful as a write, and
 * `defaultPrevented` only after the handlers have run.
 */
export function dragEvent(type: string, init: DragInit = {}): DragEvent {
	const event = new MouseEvent(type, { bubbles: true, cancelable: true });
	if (!init.withoutDataTransfer) {
		const types = init.types ?? (init.files ?? []).map((file) => file.type);
		Object.defineProperty(event, 'dataTransfer', {
			value: {
				dropEffect: 'none',
				files: init.files ?? [],
				items: types.map((type) => ({ kind: 'file', type }))
			},
			configurable: true
		});
	}
	return event as DragEvent;
}
