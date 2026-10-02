import { type MaybeGetter, resolveGetter } from '../../shared/getter.ts';
import { isBrowser } from '../../shared/is.ts';

/** Auto-reset state returned by {@link refAutoReset}. */
export interface RefAutoResetReturn<T> {
	/**
	 * Current value; writing re-arms the reset timer. Getter/setter-backed.
	 */
	value: T;
}

/**
 * Create state that falls back to `defaultValue` after `afterMs` of quiet.
 *
 * Every write stores the new value, cancels any pending timer, and re-arms one.
 * Getter arguments are re-resolved per write, so the fallback and delay can
 * follow reactive state. The pending timer is cleared when the owner unmounts.
 *
 * @param defaultValue Fallback value; getters re-resolve on every reset.
 * @param afterMs Quiet period in milliseconds; getters re-resolve per write.
 * @returns A getter/setter-backed handle holding the current value.
 * @example
 * ```ts
 * const status = refAutoReset('idle', 2000);
 * status.value = 'saved!'; // back to 'idle' after 2s quiet
 * ```
 */
export function refAutoReset<T>(
	defaultValue: MaybeGetter<T>,
	afterMs: MaybeGetter<number> = 10000
): RefAutoResetReturn<T> {
	let value = $state<T>(resolveGetter(defaultValue));
	let timer: ReturnType<typeof setTimeout> | undefined;

	const clear = (): void => {
		if (timer !== undefined) {
			clearTimeout(timer);
			timer = undefined;
		}
	};

	$effect(() => () => clear());

	return {
		get value() {
			return value;
		},
		set value(next: T) {
			value = next;
			clear();
			// On the server `$effect` never runs, so a stray timer could outlive
			// the render. Only the client arms one.
			if (!isBrowser) return;
			timer = setTimeout(() => {
				value = resolveGetter(defaultValue);
				timer = undefined;
			}, resolveGetter(afterMs));
		}
	};
}
