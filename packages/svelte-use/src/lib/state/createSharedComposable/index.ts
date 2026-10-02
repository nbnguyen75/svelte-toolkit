import { isBrowser } from '../../shared/is.ts';

/**
 * Share a single composable instance across every caller on the client.
 *
 * Server renders must stay isolated, so there the composable is returned
 * unchanged and each call builds a fresh instance.
 *
 * The shared instance is created on the first call and lives for the page's
 * lifetime: unlike Vue's `effectScope` there is **no refcount**, so nothing is
 * disposed when the last consumer unmounts. Reach for Svelte context when you
 * need per-subtree sharing or teardown.
 *
 * @param composable Factory invoked once; later calls reuse its result.
 * @returns A function returning the shared (or fresh, on the server) instance.
 * @example
 * ```ts
 * const useSharedStatus = createSharedComposable(() => refAutoReset('idle'));
 * useSharedStatus(); // one instance per page
 * ```
 */
export function createSharedComposable<Args extends unknown[], R>(
	composable: (...args: Args) => R
): (...args: Args) => R {
	if (!isBrowser) return composable;

	let shared: { value: R } | undefined;

	return (...args: Args): R => {
		if (shared === undefined) shared = { value: composable(...args) };
		return shared.value;
	};
}
