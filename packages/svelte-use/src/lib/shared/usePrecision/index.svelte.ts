import type { MaybeGetter } from '../../shared/getter.ts';

import { resolveGetter } from '../../shared/getter.ts';

/**
 * Multiply without the binary floating-point error.
 *
 * `45.125 * 100` is `4512.4999…`, so a naive `Math.round(value * power)` rounds
 * the wrong way. Scaling through the integer domain first keeps the rounding
 * honest. Only positive values with a decimal point need it; anything else is
 * already exact.
 */
function accurateMultiply(value: number, power: number): number {
	const text = value.toString();

	if (value > 0 && text.includes('.')) {
		// Guarded by the `includes` above, so the fraction always exists; the
		// fallback is for the type system, not a reachable state.
		const decimalPlaces = text.split('.')[1]?.length ?? 0;
		const multiplier = 10 ** decimalPlaces;

		return (value * multiplier * power) / multiplier;
	}

	return value * power;
}

/** Rounding method for {@link usePrecision}. */
export type UsePrecisionMath = 'floor' | 'ceil' | 'round';

/** Options for {@link usePrecision}. */
export interface UsePrecisionOptions {
	/**
	 * Which `Math` rounding to apply after scaling.
	 *
	 * @default 'round'
	 */
	math?: UsePrecisionMath;
}

/** Reactive precision state returned by {@link usePrecision}. */
export interface UsePrecisionReturn {
	/** The value rounded to `digits` decimal places. Getter-backed. */
	readonly value: number;
}

/**
 * Reactively round a number to a fixed count of decimal places.
 *
 * Must be called in component initialization.
 *
 * @param value Number to round, or a getter re-read on every access.
 * @param digits Decimal places to keep, or a getter re-read on every access.
 * @param options Rounding `math`, or a getter re-read on every access. Defaults to `{ math: 'round' }`.
 * @returns `value`, the rounded number.
 * @example
 * ```ts
 * import { usePrecision } from '@wynn-dev/svelte-use';
 *
 * const price = usePrecision(() => rawTotal, 2);
 * console.log(price.value);
 * ```
 */
export function usePrecision(
	value: MaybeGetter<number>,
	digits: MaybeGetter<number>,
	options?: MaybeGetter<UsePrecisionOptions | undefined>
): UsePrecisionReturn {
	const result = $derived.by(() => {
		const power = 10 ** resolveGetter(digits);
		const method = (options === undefined ? undefined : resolveGetter(options))?.math ?? 'round';
		return Math[method](accurateMultiply(resolveGetter(value), power)) / power;
	});

	return {
		get value() {
			return result;
		}
	};
}
