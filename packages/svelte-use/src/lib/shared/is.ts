/**
 * Type guards, predicates, and small pure helpers.
 *
 * Parity with VueUse `shared/utils/is.ts`, plus `isBrowser` — this package's
 * canonical SSR guard. Pure functions and immutable constants only: no runes,
 * no DOM access, no module-scope mutable state (`scope.md` §2), so every export
 * is safe to evaluate during SSR and safe to tree-shake.
 */

/**
 * True when both `window` and `document` exist (real browser DOM).
 * Module-scope immutable constant — safe to evaluate during SSR.
 * @example
 * ```ts
 * if (!isBrowser) return; // SSR guard
 * ```
 */
export const isBrowser: boolean = typeof window !== 'undefined' && typeof document !== 'undefined';

/**
 * VueUse's `isClient`. Identical to {@link isBrowser} by construction — same
 * `window` *and* `document` check. Prefer `isBrowser`: it is this package's
 * standard name and needs no cross-reference.
 */
export const isClient: boolean = isBrowser;

/**
 * `WorkerGlobalScope` is declared in the WebWorker lib, not the DOM lib this
 * package compiles against, so a bare identifier fails to typecheck. Probed
 * with a type guard on a *parameter* rather than an assertion:
 * `no-unsafe-type-assertion` rejects narrowing `globalThis` to a narrower
 * object type, and TS does not carry that narrowing on the global identifier.
 */
function hasWorkerGlobalScope(scope: object): scope is { WorkerGlobalScope: new () => unknown } {
	return 'WorkerGlobalScope' in scope;
}

/** The `WorkerGlobalScope` constructor if this runtime exposes one, else `undefined`. */
function workerScopeOf(scope: object): (new () => unknown) | undefined {
	return hasWorkerGlobalScope(scope) ? scope.WorkerGlobalScope : undefined;
}

const workerScope = workerScopeOf(globalThis);

/**
 * True inside a Web Worker. Probed through `WorkerGlobalScope` rather than a
 * `self.importScripts` sniff so it stays correct when that global is shadowed.
 */
export const isWorker: boolean = workerScope !== undefined && globalThis instanceof workerScope;

/** True when the value is not `undefined`. */
export function isDef<T>(value?: T): value is T {
	return typeof value !== 'undefined';
}

/**
 * True when the value is neither `null` nor `undefined`. Narrows both out at
 * once, which a bare `value !== null` cannot do.
 */
export function notNullish<T>(value?: T | null): value is NonNullable<T> {
	return value != null;
}

/** Brand check without an unbound-method reference: `[object Object]`, `[object Date]`, … */
const objectBrand = (value: unknown): string => Object.prototype.toString.call(value);

/**
 * True for plain objects — the `[object Object]` brand check. Arrays, dates,
 * maps, sets, regexes, and `null` return `false`, so this is a "record"
 * predicate rather than a general object test. Use `typeof value === 'object'`
 * for that. Class instances *do* pass: they carry no brand of their own.
 */
export function isObject(value: unknown): value is Record<PropertyKey, unknown> {
	return objectBrand(value) === '[object Object]';
}

/** True when `key` is an own property of `object` (not inherited). */
export function hasOwn<T extends object, K extends keyof T>(object: T, key: K): key is K {
	return Object.hasOwn(object, key);
}

/**
 * True when an event target is a DOM node.
 *
 * Focus events report `relatedTarget` as `EventTarget | null`, but the value is
 * always a `Node`, a `Window`, or `null`, and the DOM types do not narrow it for
 * us. Probed structurally rather than with `instanceof`, which misses nodes from
 * another realm (an iframe) and cannot narrow.
 */
export function isNode(value: EventTarget | null | undefined): value is Node {
	return !!value && 'nodeType' in value;
}

/**
 * True for a `PointerEvent`.
 *
 * A listener helper typed against a bare `EventTarget` hands back a plain
 * `Event`, because only `Window`, `Document` and `HTMLElement` carry an event
 * map - `EventTarget` does not. The DOM still guarantees the concrete type for
 * a given name (`pointermove` is always a `PointerEvent`), so the narrowing is
 * worth keeping honest here rather than asserting it at each call site.
 *
 * Probed structurally: `instanceof` misses events from another realm (an
 * iframe) and cannot narrow.
 */
export function isPointerEvent(event: Event): event is PointerEvent {
	return 'pointerId' in event;
}

/** Does nothing. Useful as a default callback. */
export function noop(): void {
	/* intentionally empty */
}

/** Current epoch milliseconds. */
export function now(): number {
	return Date.now();
}

/**
 * Current timestamp in milliseconds.
 *
 * Identical to {@link now} on purpose: VueUse's `timestamp()` is
 * `+Date.now()`, not `performance.now()`. If you need sub-millisecond
 * resolution for measuring elapsed time, call `performance.now()` directly
 * rather than expecting it here.
 */
export function timestamp(): number {
	return Date.now();
}

/**
 * Random integer in the inclusive range `[min, max]`.
 *
 * Bounds are floored/ceiled to integers first, so callers passing fractions
 * (`rand(0, 1)`) still get a whole number. Note the endpoints are inclusive,
 * unlike `Math.random()`'s `[0, 1)`.
 */
export function rand(min: number, max: number): number {
	const lo = Math.ceil(min);
	const hi = Math.floor(max);
	return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

/** `value` clamped to `[min, max]`. */
export function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

/**
 * Warn via `console.warn` when `condition` is falsy, forwarding any extra
 * `infos`. Matches VueUse, which uses `assert` as a debug-time tripwire rather
 * than a control-flow throw — it does not narrow types and never throws.
 * @example
 * ```ts
 * assert(list.length > 0, 'expected a non-empty list, got', list.length);
 * ```
 */
export function assert(condition: boolean, ...infos: unknown[]): void {
	if (!condition) console.warn(...infos);
}

/**
 * iOS detection, including iPadOS reporting itself as `Macintosh`, which is
 * disambiguated by touch-point count. False whenever there is no DOM.
 */
export function isIOS(): boolean {
	return (
		isClient &&
		Boolean(window.navigator.userAgent) &&
		(/iP(?:ad|hone|od)/.test(window.navigator.userAgent) ||
			(window.navigator.maxTouchPoints > 2 && /iPad|Macintosh/.test(window.navigator.userAgent)))
	);
}
