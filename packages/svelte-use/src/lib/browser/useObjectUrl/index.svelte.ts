import type { MaybeGetter } from '../../shared/getter.ts';

import { resolveGetter } from '../../shared/getter.ts';

/** Reactive object URL returned by {@link useObjectUrl}. */
export interface UseObjectUrlReturn {
	/**
	 * The `blob:` URL for the current object, or `undefined` when there is none.
	 * Getter-backed (destructure-safe).
	 */
	readonly value: string | undefined;
}

/**
 * Reactive `blob:` URL for an object, revoked when the object changes and when
 * the owning component unmounts. Must be called in component initialization
 * (uses `$state` / `$effect`).
 *
 * The revocation is what makes this a util rather than a call to
 * `URL.createObjectURL`: an object URL pins its blob in memory for the life of
 * the document, so leaking one leaks the file behind it. Every URL created here
 * is revoked by the same effect run that created it.
 *
 * @param object Source object, or a getter returning one. Re-resolved on every
 * effect run; `null` / `undefined` clears the URL.
 * @returns Getter-backed `value`.
 * @example
 * ```ts
 * let file = $state<File | undefined>();
 * const url = useObjectUrl(() => file);
 *
 * url.value; // 'blob:…' once mounted, or undefined
 * file = other; // the previous URL is revoked for you
 * ```
 */
export function useObjectUrl(
	object: MaybeGetter<Blob | MediaSource | null | undefined>
): UseObjectUrlReturn {
	let url = $state<string | undefined>();

	$effect(() => {
		const source = resolveGetter(object);
		// Held per run rather than read back off `url`: on a source swap the
		// cleanup of the *previous* run must revoke the URL that run created,
		// not whatever `url` happens to hold by then.
		const created = source ? URL.createObjectURL(source) : undefined;
		url = created;

		return () => {
			if (created !== undefined) URL.revokeObjectURL(created);
		};
	});

	return {
		get value() {
			return url;
		}
	};
}
