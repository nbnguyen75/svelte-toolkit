import type { MaybeGetter } from '../../shared/getter.ts';

import { resolveGetter } from '../../shared/getter.ts';
import { isBrowser } from '../../shared/is.ts';

/** Share payload, matching the Web Share API's `ShareData` shape. */
export interface UseShareOptions {
	title?: string;
	files?: File[];
	text?: string;
	url?: string;
}

/** Reactive Web Share state returned by {@link useShare}. */
export interface UseShareReturn {
	/** Whether sharing can be attempted. `false` during SSR. */
	readonly isSupported: boolean;
	/**
	 * Share `data`, merged over the setup options. Resolves without sharing
	 * when unsupported or when the platform declines (`canShare` is false).
	 */
	share: (overrideOptions?: MaybeGetter<UseShareOptions>) => Promise<void>;
}

/**
 * Reactive Web Share API.
 *
 * Must be called in component initialization.
 *
 * @param shareOptions Default payload, or a getter re-read on every share.
 * @returns `isSupported` and `share()`.
 * @example
 * ```ts
 * import { useShare } from '@wynn-dev/svelte-use';
 *
 * const { share, isSupported } = useShare({ title: 'Score', url: 'https://example.com' });
 * if (isSupported) await share({ text: 'I won' });
 * ```
 */
export function useShare(shareOptions: MaybeGetter<UseShareOptions> = {}): UseShareReturn {
	// Read once at setup: capability detection, not a value that changes.
	// `typeof`, not `in`: a stub can expose the name as `undefined`, which `in`
	// accepts and a call then throws on. `navigator` is only touched past the
	// browser guard.
	const isSupported =
		isBrowser && typeof navigator.canShare === 'function' && typeof navigator.share === 'function';

	async function share(overrideOptions: MaybeGetter<UseShareOptions> = {}): Promise<void> {
		if (!isSupported) return;
		const data = { ...resolveGetter(shareOptions), ...resolveGetter(overrideOptions) };
		if (navigator.canShare(data)) await navigator.share(data);
	}

	return { isSupported, share };
}
