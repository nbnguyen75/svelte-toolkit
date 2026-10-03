import type { MaybeGetter } from '../../shared/getter.ts';

import { resolveGetter } from '../../shared/getter.ts';
import { isBrowser, isObject } from '../../shared/is.ts';

/** Options for {@link useCssSupports}. */
export interface UseCssSupportsOptions {
	/**
	 * Reported while rendering on the server and before the first client effect
	 * run. Keep it equal to what the server renders, or hydration will disagree.
	 * @default false
	 */
	ssrValue?: boolean;
}

/** Reactive CSS support probe returned by {@link useCssSupports}. */
export interface UseCssSupportsReturn {
	/** Whether the browser understands the queried CSS. Getter-backed (destructure-safe). */
	readonly isSupported: boolean;
}

function isCssSupportsOptions(value: unknown): value is UseCssSupportsOptions {
	return isObject(value);
}

/**
 * Feature-detect a CSS declaration or at-rule through `CSS.supports`.
 *
 * The two-argument form tests a property/value pair, the one-argument form
 * tests a whole condition string. Both accept getters, so a probe re-evaluates
 * when its inputs change.
 *
 * During SSR and before the first client effect run the result is `ssrValue`
 * (`false` by default): the browser answer cannot be known while rendering on
 * the server, and reporting it early would mismatch the server HTML.
 *
 * @param property CSS property name, or a full condition string in the one-argument form.
 * @param value CSS value, paired with `property`.
 * @param options `ssrValue`.
 * @returns Getter-backed `isSupported`.
 * @example
 * ```ts
 * const grid = useCssSupports('display', 'grid');
 * const ok = grid.isSupported; // false on the server
 *
 * const container = useCssSupports('container-type: inline-size');
 * ```
 */
export function useCssSupports(
	property: MaybeGetter<string>,
	value: MaybeGetter<string>,
	options?: UseCssSupportsOptions
): UseCssSupportsReturn;
export function useCssSupports(
	conditionText: MaybeGetter<string>,
	options?: UseCssSupportsOptions
): UseCssSupportsReturn;
export function useCssSupports(
	property: MaybeGetter<string>,
	valueOrOptions?: MaybeGetter<string> | UseCssSupportsOptions,
	options?: UseCssSupportsOptions
): UseCssSupportsReturn {
	// The discriminator is the *second* argument: options are a plain object,
	// while a probe value is a string or a getter. VueUse sniffs the last
	// argument's runtime type instead, which makes an explicitly `undefined`
	// value silently switch overloads — TypeScript rejects that call here.
	let opts: UseCssSupportsOptions;
	let pairValue: MaybeGetter<string> | undefined;
	if (isCssSupportsOptions(valueOrOptions)) {
		opts = valueOrOptions;
	} else {
		opts = options ?? {};
		pairValue = valueOrOptions;
	}
	const { ssrValue = false } = opts;

	// `false` until the first effect run, and effects never run on the server.
	// A writable `$derived` rather than `$state` + `$effect`: the state exists
	// only to be flipped once, and this is the shape the linter expects.
	let mounted = $derived(false);
	$effect(() => {
		mounted = true;
	});

	const isSupported = $derived.by(() => {
		if (!isBrowser || !mounted) return ssrValue;
		const name = resolveGetter(property);
		return pairValue === undefined
			? CSS.supports(name)
			: CSS.supports(name, resolveGetter(pairValue));
	});

	return {
		get isSupported() {
			return isSupported;
		}
	};
}
