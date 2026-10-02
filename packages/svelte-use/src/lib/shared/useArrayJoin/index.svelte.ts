import type { MaybeGetter } from '../getter.ts';

import { resolveGetter } from '../getter.ts';

/** Joined state returned by {@link useArrayJoin}. */
export interface UseArrayJoinReturn {
	/** Joined string (`''` for empty lists). Getter-backed (destructure-safe). */
	readonly value: string;
}

/**
 * Reactive `Array.join`.
 *
 * @param list Array, or a getter over reactive state.
 * @param separator Pair separator; getters resolve per evaluation.
 *   Omitted means `','`, matching native `join`.
 * @returns Getter-backed `value` holding the joined string.
 * @example
 * ```ts
 * const label = useArrayJoin(['a', 'b'], ' - ');
 * label.value; // 'a - b'
 * ```
 */
export function useArrayJoin(
	list: MaybeGetter<readonly unknown[]>,
	separator?: MaybeGetter<string>
): UseArrayJoinReturn {
	const joined = $derived(
		resolveGetter(list).join(separator === undefined ? undefined : resolveGetter(separator))
	);

	return {
		get value() {
			return joined;
		}
	};
}
