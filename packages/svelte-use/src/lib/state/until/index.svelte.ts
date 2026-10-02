import { untrack } from 'svelte';

import { type MaybeGetter, resolveGetter } from '../../shared/getter.ts';

export interface UntilOptions {
	/**
	 * Reject (instead of resolving the current value) on timeout.
	 * @default false
	 */
	throwOnTimeout?: boolean;
	/**
	 * Milliseconds after which the promise settles with the current value (or
	 * rejects when `throwOnTimeout`). `0`/omitted never times out.
	 * @default 0
	 */
	timeout?: number;
}

export interface UntilBaseInstance<T> {
	/**
	 * Resolve with the first value satisfying `condition`.
	 * @example
	 * ```ts
	 * await until(() => status).toMatch((value) => value === 'ready');
	 * ```
	 */
	toMatch: (condition: (value: T) => boolean, options?: UntilOptions) => Promise<T>;
	/**
	 * Resolve with the value after `n` changes.
	 * @example
	 * ```ts
	 * await until(() => count).changedTimes(3);
	 * ```
	 */
	changedTimes: (n?: number, options?: UntilOptions) => Promise<T>;
	/**
	 * Resolve with the value after the next change.
	 * @example
	 * ```ts
	 * await until(() => count).changed();
	 * ```
	 */
	changed: (options?: UntilOptions) => Promise<T>;
}

export interface UntilValueInstance<T> extends UntilBaseInstance<T> {
	/**
	 * Resolve when the source strictly equals `value`. A getter `value` is
	 * tracked, so changing it can resolve the promise.
	 * @example
	 * ```ts
	 * await until(() => status).toBe('ready');
	 * ```
	 */
	toBe: (value: MaybeGetter<T>, options?: UntilOptions) => Promise<T>;
	/**
	 * Resolve with `undefined` once the source is `undefined`.
	 * @example
	 * ```ts
	 * await until(() => value).toBeUndefined();
	 * ```
	 */
	toBeUndefined: (options?: UntilOptions) => Promise<undefined>;
	/**
	 * Resolve with `null` once the source is `null`.
	 * @example
	 * ```ts
	 * await until(() => value).toBeNull();
	 * ```
	 */
	toBeNull: (options?: UntilOptions) => Promise<null>;
	/**
	 * Resolve with the first truthy value.
	 * @example
	 * ```ts
	 * await until(() => value).toBeTruthy();
	 * ```
	 */
	toBeTruthy: (options?: UntilOptions) => Promise<T>;
	/**
	 * Resolve with the first `NaN` value.
	 * @example
	 * ```ts
	 * await until(() => value).toBeNaN();
	 * ```
	 */
	toBeNaN: (options?: UntilOptions) => Promise<T>;
	/**
	 * Inverted matchers: resolve when the condition does not hold.
	 * @example
	 * ```ts
	 * await until(() => value).not.toBeNull();
	 * ```
	 */
	readonly not: UntilValueInstance<T>;
}

export interface UntilArrayInstance<T> extends UntilBaseInstance<T> {
	/**
	 * Resolve with the array once it contains `value`.
	 * @example
	 * ```ts
	 * await until(() => list).toContains('ready');
	 * ```
	 */
	toContains: (value: MaybeGetter<unknown>, options?: UntilOptions) => Promise<T>;
	/**
	 * Inverted matchers.
	 * @example
	 * ```ts
	 * await until(() => list).not.toContains('error');
	 * ```
	 */
	readonly not: UntilArrayInstance<T>;
}

function timeoutError(timeout: number): Error {
	return new Error(`until() timed out after ${timeout}ms`);
}

function createValueUntil<T>(source: MaybeGetter<T>, isNot: boolean): UntilValueInstance<T> {
	const toMatch = (
		condition: (value: T) => boolean,
		options: UntilOptions = {},
		extraReads: (() => void)[] = []
	): Promise<T> => {
		const { timeout = 0, throwOnTimeout = false } = options;
		return new Promise<T>((resolvePromise, rejectPromise) => {
			let timer: ReturnType<typeof setTimeout> | undefined;
			let settled = false;
			let first = true;

			const done = (settle: () => void): void => {
				if (settled) return;
				settled = true;
				if (timer !== undefined) {
					clearTimeout(timer);
					timer = undefined;
				}
				settle();
			};

			const check = (snapshot: T): void => {
				if (condition(snapshot) !== isNot) done(() => resolvePromise(snapshot));
			};

			// The mount run subscribes but never evaluates; the synchronous
			// check below covers the already-matching case, so counting
			// matchers evaluate exactly once per genuine change.
			$effect(() => {
				for (const read of extraReads) read();
				const snapshot = resolveGetter(source);
				untrack(() => {
					if (first) {
						first = false;
						return;
					}
					if (!settled) check(snapshot);
				});
			});

			check(resolveGetter(source));

			if (timeout > 0) {
				timer = setTimeout(() => {
					done(() => {
						if (throwOnTimeout) rejectPromise(timeoutError(timeout));
						else resolvePromise(resolveGetter(source));
					});
				}, timeout);
			}
		});
	};

	const toBe = (value: MaybeGetter<T>, options: UntilOptions = {}): Promise<T> =>
		toMatch((snapshot) => snapshot === resolveGetter(value), options, [() => resolveGetter(value)]);

	const changedTimes = (n = 1, options: UntilOptions = {}): Promise<T> => {
		let count = -1; // skip the immediate check
		return toMatch(() => {
			count += 1;
			return count >= n;
		}, options);
	};

	const instance: UntilValueInstance<T> = {
		toMatch: (condition, options) => toMatch(condition, options),
		changed: (options) => changedTimes(1, options),
		changedTimes: (n, options) => changedTimes(n, options),
		get not() {
			return createValueUntil(source, !isNot);
		},
		toBe: (value, options) => toBe(value, options),
		toBeTruthy: (options) => toMatch((snapshot) => Boolean(snapshot), options),
		toBeNull: (options) => toMatch((snapshot) => snapshot === null, options).then(() => null),
		toBeUndefined: (options) =>
			toMatch((snapshot) => snapshot === undefined, options).then(() => undefined),
		toBeNaN: (options) => toMatch((snapshot) => Number.isNaN(snapshot), options)
	};

	return instance;
}

function createArrayUntil<T>(source: MaybeGetter<T>, isNot: boolean): UntilArrayInstance<T> {
	const base = createValueUntil(source, isNot);

	const toContains = (value: MaybeGetter<unknown>, options: UntilOptions = {}): Promise<T> =>
		base.toMatch((snapshot) => {
			if (!Array.isArray(snapshot)) return false;
			const target = resolveGetter(value);
			return snapshot.includes(target);
		}, options);

	return {
		toMatch: (condition, options) => base.toMatch(condition, options),
		changed: (options) => base.changed(options),
		changedTimes: (n, options) => base.changedTimes(n, options),
		get not() {
			return createArrayUntil(source, !isNot);
		},
		toContains: (value, options) => toContains(value, options)
	};
}

/**
 * Promised one-time watches for array sources: resolve with the array once a
 * condition holds.
 *
 * `until` constructs a `$effect`, so call it during component initialization
 * (or inside `$effect.root`). On the server `$effect` is inert: an
 * already-matching matcher still resolves, but one that must wait cannot.
 *
 * @example
 * ```ts
 * await until(() => list).toContains('ready');
 * ```
 */
export function until<T extends unknown[]>(source: MaybeGetter<T>): UntilArrayInstance<T>;
/**
 * Promised one-time watches: resolve when a source meets a condition.
 *
 * `until` constructs a `$effect`, so call it during component initialization
 * (or inside `$effect.root`). On the server `$effect` is inert: an
 * already-matching matcher still resolves, but one that must wait cannot.
 *
 * @example
 * ```ts
 * await until(() => status).toBe('ready');
 * startHeavyWork();
 * ```
 */
export function until<T>(source: MaybeGetter<T>): UntilValueInstance<T>;
export function until<T>(source: MaybeGetter<T>): UntilValueInstance<T> | UntilArrayInstance<T> {
	const value = resolveGetter(source);
	if (Array.isArray(value)) return createArrayUntil(source, false);
	return createValueUntil(source, false);
}
