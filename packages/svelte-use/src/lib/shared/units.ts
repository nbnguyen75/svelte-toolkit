/**
 * Add `delta` to a CSS length, preserving its unit. A unit-less number is
 * added as-is; a string keeps whatever unit it carries (`px`, `em`, `rem`,
 * `vw`, `%`, ...). A value with no leading number (`var(--x)`) is returned
 * unchanged, since there is nothing to offset.
 *
 * @param target Length to offset.
 * @param delta Amount to add, in the target's own unit.
 * @returns The offset length, same type as `target`.
 * @example
 * ```ts
 * increaseWithUnit(100, 1); // 101
 * increaseWithUnit('1px', 1); // '2px'
 * increaseWithUnit('0.5vw', 1.5); // '2vw'
 * increaseWithUnit('var(--cool)', -5); // 'var(--cool)'
 * ```
 */
export function increaseWithUnit(target: number, delta: number): number;
/**
 * Add `delta` to a CSS length, preserving its unit. See the number overload.
 *
 * @param target Length to offset.
 * @param delta Amount to add, in the target's own unit.
 * @returns The offset length, same type as `target`.
 * @example
 * ```ts
 * increaseWithUnit('100%', 10); // '110%'
 * ```
 */
export function increaseWithUnit(target: string, delta: number): string;
export function increaseWithUnit(target: string | number, delta: number): string | number {
	if (typeof target === 'number') return target + delta;

	const value = target.match(/^-?\d+\.?\d*/)?.[0] ?? '';
	const result = Number.parseFloat(value) + delta;
	if (Number.isNaN(result)) return target;

	return result + target.slice(value.length);
}

/**
 * Resolve a CSS length to a pixel number for ordering and comparisons.
 * `rem` is assumed to be 16px, matching VueUse: only ever call this for
 * sort keys and off-media-query comparisons, never to size anything, since
 * the real root font size is a runtime value.
 *
 * @param px A CSS length string.
 * @returns The length in pixels; `NaN` when `px` has no leading number.
 * @example
 * ```ts
 * pxValue('640px'); // 640
 * pxValue('40rem'); // 640
 * ```
 */
export function pxValue(px: string): number {
	return px.endsWith('rem') ? Number.parseFloat(px) * 16 : Number.parseFloat(px);
}
