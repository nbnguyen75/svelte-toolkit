/**
 * A plain value or a getter returning it. Getters re-resolve on every
 * read, so reactive dependencies stay tracked through `$derived`/`$effect`.
 * @example
 * ```ts
 * declare const source: MaybeGetter<number>;
 * ```
 */
export type MaybeGetter<T> = T | (() => T);

function isGetter<T>(value: MaybeGetter<T>): value is () => T {
	return typeof value === 'function';
}

/**
 * Unwrap a {@link MaybeGetter}: call it when it is a function, return it
 * as-is otherwise.
 * @example
 * ```ts
 * resolveGetter(source); // call it if it is a function, else pass through
 * ```
 */
export function resolveGetter<T>(value: MaybeGetter<T>): T {
	return isGetter(value) ? value() : value;
}
