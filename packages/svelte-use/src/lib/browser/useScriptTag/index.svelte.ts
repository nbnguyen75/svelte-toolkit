import type { MaybeGetter } from '../../shared/getter.ts';

import { resolveGetter } from '../../shared/getter.ts';
import { isBrowser, noop } from '../../shared/is.ts';

/** Options for {@link useScriptTag}. */
export interface UseScriptTagOptions {
	/** Set the element's `referrerPolicy`. */
	referrerPolicy?: HTMLScriptElement['referrerPolicy'];
	/** Set the element's `crossOrigin`. */
	crossOrigin?: 'anonymous' | 'use-credentials';
	/** Extra attributes set on the created element. */
	attrs?: Record<string, string>;
	/**
	 * Load on mount.
	 * @default true
	 */
	immediate?: boolean;
	/** Set the element's `noModule`. */
	noModule?: boolean;
	/**
	 * Take over `load` / `unload` entirely. When `true`, nothing loads on mount
	 * and nothing is removed on unmount.
	 * @default false
	 */
	manual?: boolean;
	/**
	 * `async` attribute of the created element.
	 * @default true
	 */
	async?: boolean;
	/** Set the element's `defer`. */
	defer?: boolean;
	/** CSP nonce for the created element. */
	nonce?: string;
	/**
	 * `type` attribute of the created element.
	 * @default 'text/javascript'
	 */
	type?: string;
}

/** Script element state returned by {@link useScriptTag}. */
export interface UseScriptTagReturn {
	/**
	 * Load `src`, at most once per load/unload cycle — repeat calls return the
	 * same promise instead of injecting a second element.
	 *
	 * @param waitForScriptLoad Resolve on the element's `load` event rather than
	 * as soon as it is in the document. @default true
	 */
	load: (waitForScriptLoad?: boolean) => Promise<HTMLScriptElement | false>;
	/** The injected element, or `undefined` before load. Getter-backed (destructure-safe). */
	readonly scriptTag: HTMLScriptElement | undefined;
	/** Remove the element and allow a later `load()` to inject it again. */
	unload: () => void;
}

/**
 * The `<script src="…">` already in the document for `url`, if any.
 *
 * Compared through a filtered list rather than a `querySelector` attribute
 * selector: the URL is user input, and escaping it for a *selector* is both
 * error-prone (`CSS.escape` is for identifiers, not quoted strings) and
 * unnecessary here. `el.src` and the resolved target are both absolute, so a
 * relative `src` in the markup still matches.
 */
function findScript(url: string): HTMLScriptElement | undefined {
	const resolved = URL.canParse(url) ? new URL(url).href : url;
	return [...document.head.querySelectorAll('script')].find((el) => el.src === resolved);
}

/**
 * Loads a `<script src>` once, deduplicated across callers that ask for the
 * same URL, and removes it on unmount. Must be called in component
 * initialization (uses `$state` / `$effect`).
 *
 * An element already in the document is adopted rather than duplicated, which
 * is what keeps two components loading the same CDN file from racing. A tag that
 * finished loading carries `data-loaded`, so a second caller resolves
 * immediately instead of waiting for an event that already fired.
 *
 * @param src Script URL, or a getter returning it. Re-resolved on each load.
 * @param onLoaded Called with the element once it has loaded.
 * @param options `immediate`, `manual`, `type`, `async`, `defer`, `noModule`,
 * `crossOrigin`, `referrerPolicy`, `nonce`, `attrs`.
 * @returns `scriptTag`, `load`, `unload`.
 * @example
 * ```ts
 * const script = useScriptTag('https://cdn.example/lib.js');
 *
 * await script.load();          // injected and resolved on load
 * await script.load(false);     // resolves as soon as it is in <head>
 * script.unload();
 * ```
 */
export function useScriptTag(
	src: MaybeGetter<string>,
	onLoaded: (el: HTMLScriptElement) => void = noop,
	options: UseScriptTagOptions = {}
): UseScriptTagReturn {
	const {
		immediate = true,
		manual = false,
		type = 'text/javascript',
		async = true,
		defer,
		noModule,
		crossOrigin,
		referrerPolicy,
		nonce,
		attrs
	} = options;

	let scriptTag = $state<HTMLScriptElement | undefined>();

	// One in-flight load per cycle. `null` again after `unload()`, so a later
	// load really does inject the element a second time.
	let inflight: Promise<HTMLScriptElement | false> | null = null;

	function loadScript(waitForScriptLoad: boolean): Promise<HTMLScriptElement | false> {
		// No document means SSR: resolve rather than reject, so a caller awaiting
		// during render is not left hanging.
		if (!isBrowser) return Promise.resolve(false);

		return new Promise<HTMLScriptElement | false>((resolve, reject) => {
			const url = resolveGetter(src);

			// Adopt whatever is already in the document; inject only when there is
			// nothing there. Two components asking for the same file therefore
			// share one element instead of racing to add two.
			const existing = findScript(url);
			const el = existing ?? document.createElement('script');

			// A tag that already finished carries `data-loaded`, and its `load`
			// event will not fire again — resolving on the listener would hang.
			if (existing?.hasAttribute('data-loaded')) {
				scriptTag = existing;
				resolve(existing);
				return;
			}

			if (!existing) {
				el.type = type;
				el.async = async;
				el.src = url;
				if (defer) el.defer = defer;
				if (noModule) el.noModule = noModule;
				if (crossOrigin) el.crossOrigin = crossOrigin;
				if (referrerPolicy) el.referrerPolicy = referrerPolicy;
				if (nonce) el.nonce = nonce;
				for (const [name, value] of Object.entries(attrs ?? {})) el.setAttribute(name, value);
				document.head.appendChild(el);
			}
			scriptTag = el;

			if (!waitForScriptLoad) {
				resolve(el);
				return;
			}

			// Plain listeners, not `useEventListener`: that util creates an
			// `$effect`, which cannot be constructed from a promise executor —
			// `load()` is reachable from a plain click handler in `manual` mode.
			// These are one-shot and every one is removed on settle.
			const detachers: Array<() => void> = [];
			const on = (event: string, handler: (e: Event) => void) => {
				el.addEventListener(event, handler, { passive: true });
				detachers.push(() => el.removeEventListener(event, handler));
			};

			// `error` and `load` can both arrive (a retry after a failure); the
			// first one to settle owns the promise.
			let settled = false;
			const settle = (fn: () => void) => {
				if (settled) return;
				settled = true;
				for (const detach of detachers) detach();
				fn();
			};

			on('error', (event) => settle(() => reject(event)));
			on('abort', (event) => settle(() => reject(event)));
			on('load', () =>
				settle(() => {
					el.setAttribute('data-loaded', 'true');
					onLoaded(el);
					resolve(el);
				})
			);
		});
	}

	function load(waitForScriptLoad = true): Promise<HTMLScriptElement | false> {
		inflight ??= loadScript(waitForScriptLoad);
		return inflight;
	}

	function unload(): void {
		if (!isBrowser) return;
		inflight = null;
		// Remove the element this util actually holds rather than re-querying by
		// the current `src`: a getter may have moved on since load, and the old tag
		// would then be left behind.
		scriptTag?.remove();
		scriptTag = undefined;
	}

	if (!manual) {
		$effect(() => {
			if (immediate) void load();
			return unload;
		});
	}

	return {
		get scriptTag() {
			return scriptTag;
		},
		load,
		unload
	};
}
