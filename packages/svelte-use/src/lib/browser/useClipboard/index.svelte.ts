/** Options for {@link useClipboard}. */
export interface UseClipboardOptions {
	/**
	 * Milliseconds the `copied` flag stays `true` after a successful copy.
	 * @default 1500
	 */
	copiedDuring?: number;
}

/** Reactive clipboard state returned by {@link useClipboard}. */
export interface UseClipboardReturn {
	/**
	 * Copy `value`; safe no-op when unsupported. Rejects if the write is denied.
	 *
	 * A string is written as plain text. {@link ClipboardItems} (images, custom
	 * MIME types) is written verbatim via `navigator.clipboard.write`.
	 */
	copy: (value: string | ClipboardItems) => Promise<void>;
	/** Whether the async Clipboard API is available in this environment. Always `false` during SSR. */
	readonly isSupported: boolean;
	/** `true` while inside the post-copy window. Getter-backed (destructure-safe). */
	readonly copied: boolean;
	/**
	 * Last successfully copied text. Getter-backed (destructure-safe). A rich
	 * `ClipboardItems` copy does not touch it - there is no text to report.
	 */
	readonly text: string;
}

/**
 * Reactive clipboard copy state. Must be called in component initialization
 * (uses `$state` / `$effect`).
 *
 * The reset timer is disposed on unmount and in-flight copies are dropped,
 * so unmounting mid-copy leaves no stale writes.
 *
 * @param opts `copiedDuring` window in milliseconds.
 * @returns Getter-backed `copied` / `text`, `isSupported`, and `copy`.
 * @example
 * ```ts
 * const clipboard = useClipboard();
 * await clipboard.copy('copy me');
 * clipboard.copied; // true for 1500ms
 * ```
 * @example
 * ```ts
 * // Rich content: copy the image the user is looking at.
 * const { copy } = useClipboard();
 * await copy([new ClipboardItem({ 'image/png': blob })]);
 * ```
 */
export function useClipboard(opts?: UseClipboardOptions): UseClipboardReturn {
	const copiedDuring = opts?.copiedDuring ?? 1500;

	let copied = $state(false);
	let text = $state('');
	let timer: ReturnType<typeof setTimeout> | undefined;
	let alive = true;

	$effect(() => {
		return () => {
			alive = false;
			if (timer) clearTimeout(timer);
			timer = undefined;
		};
	});

	const isSupported = typeof navigator !== 'undefined' && !!navigator.clipboard;

	async function copy(value: string | ClipboardItems) {
		if (!isSupported) return;
		if (typeof value === 'string') {
			await navigator.clipboard.writeText(value);
			if (!alive) return;
			text = value;
		} else {
			// Rich content: the browser takes the items verbatim, and there is no
			// text form of them to record.
			await navigator.clipboard.write(value);
			if (!alive) return;
		}
		copied = true;

		if (timer) clearTimeout(timer);
		timer = setTimeout(() => (copied = false), copiedDuring);
	}

	return {
		get copied() {
			return copied;
		},
		get text() {
			return text;
		},
		isSupported,
		copy
	};
}
