import { resolveGetter } from '../../shared/getter.ts';

/** Options for {@link useLastChanged}. */
export interface UseLastChangedOptions {
	/** Value used for the first `timestamp()` call. @default Date.now */
	timestamp?: () => number;
	/** Fire on the first run as well as on later changes. @default false */
	immediate?: boolean;
}

/** Last-change state returned by {@link useLastChanged}. */
export interface UseLastChangedReturn {
	/** Whether the source has changed at least once. Getter-backed. */
	readonly hasChanged: boolean;
	/** Timestamp of the last change. Getter-backed. */
	readonly timestamp: number;
}

/**
 * Records when a reactive source last changed.
 *
 * @param source Reactive source: a value or a getter over reactive state.
 * @param options `immediate` and a custom `timestamp` (useful for tests).
 * @returns `timestamp` and `hasChanged`.
 * @example
 * ```ts
 * const last = useLastChanged(count);
 * $effect(() => {
 * 	if (last.hasChanged) console.log(last.timestamp);
 * });
 * ```
 */
export function useLastChanged<T>(
	source: T | (() => T),
	options: UseLastChangedOptions = {}
): UseLastChangedReturn {
	const { immediate = false, timestamp = Date.now } = options;

	let changedAt: number | undefined = $state();
	let first = true;

	$effect(() => {
		// Track the source (deeply when proxied) before stamping.
		resolveGetter(source);
		if (first) {
			first = false;
			if (immediate) changedAt = timestamp();
			return;
		}
		changedAt = timestamp();
	});

	return {
		get hasChanged() {
			return changedAt !== undefined;
		},
		get timestamp() {
			return changedAt ?? 0;
		}
	};
}
