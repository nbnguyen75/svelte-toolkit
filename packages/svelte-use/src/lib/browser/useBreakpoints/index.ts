import type { MaybeGetter } from '../../shared/getter.ts';

import { MediaQuery } from 'svelte/reactivity';
import { resolveGetter } from '../../shared/getter.ts';
import { isBrowser } from '../../shared/is.ts';
import { increaseWithUnit, pxValue } from '../../shared/units.ts';

export * from './breakpoints.ts';

/**
 * Sub-pixel nudge that turns an inclusive media query into a strict one, so
 * `greater('md')` means "wider than md" rather than "md or wider".
 */
const PX_EPSILON = 0.1;

/**
 * Recovers `K` from an enumerated key without a type assertion: own-ness is
 * checked at runtime, which also keeps inherited names (`toString`, …) out of
 * the result — something a bare `as K[]` would have let through.
 */
function ownKeys<K extends string>(source: Record<K, number | string>): (key: string) => key is K {
	return (key: string): key is K => Object.hasOwn(source, key);
}

/** Options for {@link useBreakpoints}. */
export interface UseBreakpointsOptions {
	/**
	 * Direction the per-key shorthand resolves against. `'min-width'` is
	 * mobile-first: `bp.md` is true at `md` and wider. `'max-width'` is
	 * desktop-first: `bp.md` is true at or below `md`.
	 * @default 'min-width'
	 */
	strategy?: 'max-width' | 'min-width';
}

/** Named comparison helpers returned by {@link useBreakpoints}. */
export interface UseBreakpointsMethods<K extends string = string> {
	/**
	 * The single breakpoint that best describes the viewport, or `''` when the
	 * viewport is narrower (mobile-first) or wider (desktop-first) than every
	 * entry. With `'min-width'` this is the largest matching key; with
	 * `'max-width'`, the smallest.
	 */
	active: () => K | '';
	/**
	 * True between two breakpoints, inclusive of the lower bound and exclusive
	 * of the upper one, so adjacent ranges never both match.
	 * @param a Lower bound, inclusive.
	 * @param b Upper bound, exclusive.
	 */
	between: (a: MaybeGetter<K>, b: MaybeGetter<K>) => boolean;
	/** Every matching breakpoint, ascending by width. Empty when none match. */
	current: () => K[];
	/**
	 * True strictly wider than `k`.
	 * @param k Breakpoint key, or a getter returning one.
	 */
	greater: (k: MaybeGetter<K>) => boolean;
	/**
	 * True at `k` or wider.
	 * @param k Breakpoint key, or a getter returning one.
	 */
	greaterOrEqual: (k: MaybeGetter<K>) => boolean;
	/**
	 * True strictly narrower than `k`.
	 * @param k Breakpoint key, or a getter returning one.
	 */
	smaller: (k: MaybeGetter<K>) => boolean;
	/**
	 * True at `k` or narrower.
	 * @param k Breakpoint key, or a getter returning one.
	 */
	smallerOrEqual: (k: MaybeGetter<K>) => boolean;
}

/**
 * Reactive breakpoint state: one boolean per key (readable as `bp.md`) plus the
 * named helpers. Reading any of them inside a template, `$derived`, or `$effect`
 * subscribes to viewport changes.
 */
export type UseBreakpointsReturn<K extends string = string> = Record<K, boolean> &
	UseBreakpointsMethods<K>;

/**
 * Reactive viewport breakpoints.
 *
 * Every helper returns a plain `boolean` rather than a ref, because
 * `MediaQuery.current` is already reactive: calling `bp.md` or `bp.greater('md')`
 * inside a template or `$derived` re-runs on resize. That collapses VueUse's two
 * families (`greater` / `isGreater`) into one.
 *
 * Values are CSS lengths — a bare number is read as pixels, a string keeps its
 * unit (`'40em'`, `'80rem'`). `rem` is only resolved for ordering, assuming
 * 16px, matching VueUse.
 *
 * On the server every helper returns `false` / `''`, because `MediaQuery` needs
 * `window.matchMedia`. VueUse's default `ssrWidth` is `0`, which produces the
 * same all-false result, so nothing is lost; gate server-sensitive markup
 * yourself if you need a real width.
 *
 * @param breakpoints Breakpoint map, e.g. `{ sm: 640, md: 768 }`.
 * @param opts `strategy` override.
 * @returns One boolean per key plus `active`, `between`, `current`, `greater`, `greaterOrEqual`, `smaller`, `smallerOrEqual`.
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { breakpointsTailwind, useBreakpoints } from '@wynn-dev/svelte-use';
 *
 *   const bp = useBreakpoints(breakpointsTailwind);
 * </script>
 *
 * <p>current: {bp.active()}</p>
 * <p>desktop: {bp.greaterOrEqual('lg')}</p>
 * <p>phone sized: {bp.smaller('md')}</p>
 * ```
 */
export function useBreakpoints<K extends string>(
	breakpoints: Record<K, number | string>,
	opts: UseBreakpointsOptions = {}
): UseBreakpointsReturn<K> {
	const strategy = opts.strategy ?? 'min-width';

	// An unknown key reads as `0px` rather than `undefined`, so a typo produces
	// a defined query instead of a `(min-width: undefinedpx)` match error.
	function lengthOf(key: K): string {
		if (!Object.hasOwn(breakpoints, key)) return '0px';
		const value = breakpoints[key];
		return typeof value === 'number' ? `${value}px` : value;
	}

	// ponytail: keyed by query string, never evicted. Distinct queries are
	// bounded by the call sites (one per breakpoint, one per between() pair),
	// and the whole map is collected along with this closure.
	const cache = new Map<string, MediaQuery>();

	function matches(query: string): boolean {
		if (!isBrowser) return false;
		let media = cache.get(query);
		if (media === undefined) {
			media = new MediaQuery(query);
			cache.set(query, media);
		}
		return media.current;
	}

	const shorthand = Object.keys(breakpoints)
		.filter(ownKeys(breakpoints))
		.map((key) => {
			const length = lengthOf(key);
			return { key, px: pxValue(length), query: `(${strategy}: ${length})` };
		})
		.toSorted((a, b) => a.px - b.px);

	// `Object.defineProperty` is the only way to attach a live *getter* per key,
	// and TypeScript cannot prove a dynamically keyed record got populated.
	// The assertion is sound — every own key of `breakpoints` is filled below —
	// so it is waived here rather than contorting the public type.
	// oxlint-disable-next-line typescript/no-unsafe-type-assertion
	const shortcuts = {} as Record<K, boolean>;
	for (const { key, query } of shorthand) {
		Object.defineProperty(shortcuts, key, {
			configurable: true,
			enumerable: true,
			get: () => matches(query)
		});
	}

	function current(): K[] {
		return shorthand.filter(({ query }) => matches(query)).map(({ key }) => key);
	}

	return Object.assign(shortcuts, {
		active(): K | '' {
			const active = current();
			return (strategy === 'min-width' ? active.at(-1) : active[0]) ?? '';
		},
		between(a: MaybeGetter<K>, b: MaybeGetter<K>): boolean {
			const lower = lengthOf(resolveGetter(a));
			const upper = increaseWithUnit(lengthOf(resolveGetter(b)), -PX_EPSILON);
			return matches(`(min-width: ${lower}) and (max-width: ${upper})`);
		},
		current,
		greater(k: MaybeGetter<K>): boolean {
			return matches(`(min-width: ${increaseWithUnit(lengthOf(resolveGetter(k)), PX_EPSILON)})`);
		},
		greaterOrEqual(k: MaybeGetter<K>): boolean {
			return matches(`(min-width: ${lengthOf(resolveGetter(k))})`);
		},
		smaller(k: MaybeGetter<K>): boolean {
			return matches(`(max-width: ${increaseWithUnit(lengthOf(resolveGetter(k)), -PX_EPSILON)})`);
		},
		smallerOrEqual(k: MaybeGetter<K>): boolean {
			return matches(`(max-width: ${lengthOf(resolveGetter(k))})`);
		}
	});
}
