import type { MaybeGetter } from '../../shared/getter.ts';

import { resolveGetter } from '../../shared/getter.ts';
import { isBrowser, noop } from '../../shared/is.ts';

/** Any input {@link useBase64} knows how to encode. */
export type Base64Target =
	| string
	| Blob
	| ArrayBuffer
	| HTMLCanvasElement
	| HTMLImageElement
	| object;

/** Options for {@link useBase64}. */
export interface UseBase64Options {
	/**
	 * Serializer for object / array / `Map` / `Set` input. Defaults to JSON, with
	 * `Map` converted to an object and `Set` to an array.
	 *
	 * Typed `object` rather than VueUse's per-input `T`: a serializer body
	 * normally starts at `JSON.stringify`, which takes anything, and this keeps
	 * the module assertion-free.
	 */
	serializer?: (value: object) => string;
	/**
	 * Output as a Data URL (`data:<mime>;base64,…`) rather than raw base64.
	 * @default true
	 */
	dataUrl?: boolean;
	/**
	 * Encoder quality, `0`–`1`, for `image/jpeg` / `image/webp` output. Ignored
	 * by every other input type and every other MIME type.
	 *
	 * Left `undefined` by default so the browser's own default applies, which is
	 * what VueUse does too; Chrome uses `0.92`.
	 */
	quality?: number;
	/**
	 * MIME type for `HTMLCanvasElement` / `HTMLImageElement` input. Ignored by
	 * every other input type. Left `undefined` by default, so the browser's own
	 * default applies (`image/png`).
	 */
	type?: string;
}

/** Reactive base64 state returned by {@link useBase64}. */
export interface UseBase64Return {
	/**
	 * Promise for the run in flight, `undefined` before the first run.
	 * Getter-backed (destructure-safe). Rejects if the target cannot be encoded,
	 * and rejects only for the latest run.
	 */
	readonly promise: Promise<string> | undefined;
	/** Re-run the encoding by hand, outside the reactive trigger. */
	execute: () => Promise<string>;
	/**
	 * The encoded result, `''` until the first run settles. Getter-backed
	 * (destructure-safe).
	 */
	readonly base64: string;
}

const DATA_URL_PREFIX = /^data:.*?;base64,/;

// Duck-typed rather than `instanceof`: `Blob`, `HTMLCanvasElement` and
// `HTMLImageElement` are realm-bound, so an element or blob handed over from an
// iframe or a worker fails `instanceof` against this realm's constructors.
function isBlob(value: object): value is Blob {
	return (
		typeof Reflect.get(value, 'arrayBuffer') === 'function' &&
		typeof Reflect.get(value, 'size') === 'number'
	);
}

function isArrayBuffer(value: object): value is ArrayBuffer {
	return (
		typeof Reflect.get(value, 'byteLength') === 'number' &&
		typeof Reflect.get(value, 'slice') === 'function'
	);
}

function isCanvas(value: object): value is HTMLCanvasElement {
	return typeof Reflect.get(value, 'toDataURL') === 'function';
}

function isImage(value: object): value is HTMLImageElement {
	return Reflect.get(value, 'tagName') === 'IMG';
}

// Keyed off members that are unique to each collection: `entries`/`values` are
// on Array.prototype too, so a Set/Map test built from those also matches every
// array. Arrays fall through to plain JSON, which is what they want anyway.
function isMap(value: object): value is Map<PropertyKey, unknown> {
	return (
		typeof Reflect.get(value, 'get') === 'function' &&
		typeof Reflect.get(value, 'set') === 'function'
	);
}

function isSet(value: object): value is Set<unknown> {
	return (
		typeof Reflect.get(value, 'add') === 'function' &&
		typeof Reflect.get(value, 'has') === 'function'
	);
}

/** JSON, with `Map` as an object and `Set` as an array, matching VueUse. */
function defaultSerializer(value: object): string {
	if (isMap(value)) return JSON.stringify(Object.fromEntries(value));
	if (isSet(value)) return JSON.stringify(Array.from(value));
	return JSON.stringify(value);
}

function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.addEventListener(
			'load',
			() => {
				// `readAsDataURL` always resolves to a string; anything else is not
				// a base64 payload and stringifying it would only hide the mistake.
				const result = reader.result;
				resolve(typeof result === 'string' ? result : '');
			},
			{ once: true }
		);
		reader.addEventListener(
			'error',
			() => reject(reader.error ?? new Error('useBase64: could not read blob')),
			{ once: true }
		);
		reader.readAsDataURL(blob);
	});
}

function bufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	// Chunked on purpose: `String.fromCharCode(...bytes)` passes one argument
	// per element and blows the argument limit on real payloads.
	const CHUNK = 0x8000;
	let binary = '';
	for (let offset = 0; offset < bytes.length; offset += CHUNK) {
		binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK));
	}
	return btoa(binary);
}

function imageLoaded(image: HTMLImageElement): Promise<void> {
	if (image.complete) return Promise.resolve();
	return new Promise((resolve, reject) => {
		image.addEventListener('load', () => resolve(), { once: true });
		image.addEventListener('error', () => reject(new Error('useBase64: image failed to load')), {
			once: true
		});
	});
}

async function imageToDataUrl(image: HTMLImageElement, options: UseBase64Options): Promise<string> {
	// A fresh element, not a clone: `cloneNode` copies the `src` attribute but
	// not the cross-origin state we must set *before* the fetch starts, and
	// `crossOrigin` has to be in place first or the browser never re-reads it.
	// Either way the caller's element is left alone, which matters because
	// writing to it changes how the page loads that image from then on.
	const clone = new Image();
	clone.crossOrigin = 'Anonymous';
	clone.src = image.currentSrc || image.src;
	await imageLoaded(clone);

	const canvas = document.createElement('canvas');
	canvas.width = clone.naturalWidth || clone.width;
	canvas.height = clone.naturalHeight || clone.height;
	const context = canvas.getContext('2d');
	if (!context) throw new Error('useBase64: 2d canvas context unavailable');
	context.drawImage(clone, 0, 0, canvas.width, canvas.height);
	return canvas.toDataURL(options.type, options.quality);
}

async function encode(
	value: Base64Target | null | undefined,
	options: UseBase64Options
): Promise<string> {
	if (value === null || value === undefined) return '';
	if (typeof value === 'string') {
		return blobToBase64(new Blob([value], { type: 'text/plain' }));
	}
	if (isBlob(value)) return blobToBase64(value);
	if (isArrayBuffer(value)) return bufferToBase64(value);
	if (isCanvas(value)) return value.toDataURL(options.type, options.quality);
	if (isImage(value)) return imageToDataUrl(value, options);
	const serialized = options.serializer ? options.serializer(value) : defaultSerializer(value);
	return blobToBase64(new Blob([serialized], { type: 'application/json' }));
}

/**
 * Reactive base64 encoding of text, binary data, blobs, canvas and image
 * elements, or any serializable object. Must be called in component
 * initialization (uses `$state` / `$effect`).
 *
 * Re-encodes whenever the target changes, and drops the result of a run that a
 * newer run has superseded, so a fast-changing target cannot settle out of order
 * and show a stale encoding.
 *
 * VueUse spells this as eight overloads so each input pins its own option
 * shape. One signature carries all of them here: `type` / `quality` apply to
 * canvas and image input, `serializer` to object input, and the rest are
 * ignored. See the README for the parity note.
 *
 * @param target Source to encode, or a getter returning one.
 * @param options `dataUrl`, `type`, `quality`, `serializer`.
 * @returns Getter-backed `base64` / `promise`, plus `execute`.
 * @example
 * ```ts
 * let file = $state<File | undefined>();
 * const { base64 } = useBase64(() => file);
 *
 * base64.value; // 'data:…;base64,…' once mounted
 * file = other; // re-encoded for you
 * ```
 */
export function useBase64(
	target: MaybeGetter<Base64Target | null | undefined>,
	options: UseBase64Options = {}
): UseBase64Return {
	let base64 = $state('');
	// `$state.raw`: a promise is not state worth proxying, and nothing reads it
	// reactively - consumers await it.
	let promise = $state.raw<Promise<string> | undefined>(undefined);
	let run = 0;

	function execute(): Promise<string> {
		// Outside a component there is no FileReader, btoa or canvas. Resolve
		// empty rather than throwing so a manual call on the server is inert.
		if (!isBrowser) return Promise.resolve('');

		const current = ++run;
		const pending = encode(resolveGetter(target), options);
		promise = pending;

		pending.then((result) => {
			// A newer run already started: its result is the one that counts.
			if (current !== run) return;
			base64 = options.dataUrl === false ? result.replace(DATA_URL_PREFIX, '') : result;
		}, noop);

		return pending;
	}

	$effect(() => {
		// Reading the target here is what tracks it. `execute` writes state this
		// effect never reads, so there is no update cycle. The rejection is
		// swallowed for the automatic run only - `execute` still hands callers
		// the rejecting promise to handle themselves.
		resolveGetter(target);
		void execute().catch(noop);
	});

	return {
		get base64() {
			return base64;
		},
		get promise() {
			return promise;
		},
		execute
	};
}
