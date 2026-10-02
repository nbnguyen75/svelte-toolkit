import { type MaybeGetter, resolveGetter } from '../../shared/getter.ts';
import { type WatchIgnorableReturn, watchIgnorable } from '../watchIgnorable/index.ts';

export type WatchTriggerableCallback<T, R = void> = (
	value: T,
	oldValue: T | undefined,
	onCleanup: (cleanup: () => void) => void
) => R;

export interface WatchTriggerableOptions {
	/**
	 * Run the callback once on mount, before any change.
	 * @default false
	 */
	immediate?: boolean;
}

export interface WatchTriggerableReturn<R = void> extends WatchIgnorableReturn {
	/**
	 * Run the callback immediately with the current value and no old value.
	 * @returns Whatever the callback returned.
	 */
	trigger: () => R;
}

/**
 * Watch a reactive source and also let the callback be invoked manually.
 *
 * Builds on `watchIgnorable`: the callback gets `(value, oldValue, onCleanup)`
 * and its return value flows out of `trigger()`. The previous cleanup runs
 * before every fire, including a manual trigger.
 *
 * @param source Reactive source: a value or a getter over reactive state.
 * @param cb Called on each change (or `trigger()`) with
 *   `(value, oldValue, onCleanup)`.
 * @param options See {@link WatchTriggerableOptions}.
 * @returns Controls to trigger, ignore updates and stop watching.
 * @example
 * ```ts
 * const { trigger } = watchTriggerable(() => settings, apply);
 * trigger(); // apply the current settings now
 * ```
 */
export function watchTriggerable<T, R = void>(
	source: MaybeGetter<T>,
	cb: WatchTriggerableCallback<T, R>,
	options: WatchTriggerableOptions = {}
): WatchTriggerableReturn<R> {
	let cleanup: (() => void) | undefined;

	const onCleanup = (fn: () => void): void => {
		cleanup = fn;
	};

	const runCleanup = (): void => {
		const fn = cleanup;
		cleanup = undefined;
		fn?.();
	};

	const wrapped = (value: T, oldValue: T | undefined): R => {
		runCleanup();
		return cb(value, oldValue, onCleanup);
	};

	const watch = watchIgnorable(source, wrapped, options);

	// `watchIgnorable` owns no cleanup here (it receives `wrapped`), so keep one
	// effect of our own to flush the pending cleanup when the owner unmounts.
	$effect(() => () => runCleanup());

	const trigger = (): R => watch.ignoreUpdates(() => wrapped(resolveGetter(source), undefined));

	return {
		ignoreUpdates: <TResult>(updater: () => TResult): TResult => watch.ignoreUpdates(updater),
		ignorePrevAsyncUpdates: () => watch.ignorePrevAsyncUpdates(),
		stop: () => {
			runCleanup();
			watch.stop();
		},
		trigger
	};
}
