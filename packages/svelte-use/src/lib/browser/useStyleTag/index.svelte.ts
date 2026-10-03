import type { MaybeGetter } from '../../shared/getter.ts';

import { untrack } from 'svelte';

import { resolveGetter } from '../../shared/getter.ts';
import { isBrowser } from '../../shared/is.ts';

/** Options for {@link useStyleTag}. */
export interface UseStyleTagOptions {
	/**
	 * Append the element on mount.
	 * @default true
	 */
	immediate?: boolean;
	/**
	 * Take over `load` / `unload` entirely. When `true`, nothing is injected on
	 * mount and nothing is removed on unmount.
	 * @default false
	 */
	manual?: boolean;
	/** Media query the styles apply under, written to the element's `media`. */
	media?: string;
	/** CSP nonce, written to the element's `nonce`. */
	nonce?: string;
	/**
	 * DOM `id` for the injected element. Pass the same `id` from two callers to
	 * have them write into one shared `<style>` element.
	 * @default 'svelte-use-styletag-<uuid>'
	 */
	id?: string;
}

/** Style element state returned by {@link useStyleTag}. */
export interface UseStyleTagReturn {
	/** Whether the element is in the document. Getter-backed (destructure-safe). */
	readonly isLoaded: boolean;
	/** DOM `id` of the injected element. */
	readonly id: string;
	/** Remove the element and stop mirroring the source. Safe when not loaded. */
	unload: () => void;
	/** Inject the element, or adopt one already carrying this `id`. */
	load: () => void;
	/** CSS text written to the element. Getter/setter-backed (destructure-safe). */
	css: string;
}

/** Structural check for a `<style>` element — `instanceof` on a DOM type is banned. */
function isStyleElement(el: Element | null): el is HTMLStyleElement {
	return el !== null && el.tagName === 'STYLE';
}

/**
 * Injects a `<style>` element whose text follows a reactive CSS source, and
 * removes it on unmount. Must be called in component initialization (uses
 * `$state` / `$effect`).
 *
 * @param css CSS text, or a getter returning it. Re-resolved on every effect
 * run, so a `$state` string tracks as it changes.
 * @param options `id`, `immediate`, `manual`, `media`, `nonce`.
 * @returns `id`, writable `css`, `isLoaded`, `load`, `unload`.
 * @example
 * ```ts
 * let hue = $state(210);
 * const style = useStyleTag(() => `:root { --hue: ${hue} }`);
 *
 * style.isLoaded; // true after mount
 * style.unload(); // removed from <head>
 * ```
 */
export function useStyleTag(
	css: MaybeGetter<string>,
	options: UseStyleTagOptions = {}
): UseStyleTagReturn {
	const { immediate = true, manual = false, media, nonce } = options;

	// Generated per call, not by a module counter: `scope.md` §2 bans
	// module-scope mutable state and nothing here needs sequential ids. A
	// `<style>` only exists in the browser, so the id never reaches markup.
	const id = options.id ?? `svelte-use-styletag-${crypto.randomUUID()}`;

	let text = $state(resolveGetter(css));
	let isLoaded = $state(false);

	// The element this instance owns. Deliberately a plain closure variable and
	// not `$state`: nothing renders it, and `isLoaded` is the reactive signal
	// that tells the mirroring effect there is something to write to.
	let el: HTMLStyleElement | undefined;

	function load(): void {
		if (!isBrowser) return;
		// Read untracked: this guard runs inside the load effect, and an effect
		// that both reads and writes the same state re-runs itself forever
		// (`effect_update_depth_exceeded`). The flag is imperative bookkeeping;
		// the mirroring effect is what depends on it reactively.
		if (untrack(() => isLoaded)) return;

		const existing = document.getElementById(id);
		el = isStyleElement(existing) ? existing : document.createElement('style');

		if (!el.isConnected) {
			el.id = id;
			if (nonce) el.nonce = nonce;
			if (media) el.media = media;
			document.head.appendChild(el);
		}

		isLoaded = true;
	}

	function unload(): void {
		if (!untrack(() => isLoaded)) return;
		el?.remove();
		el = undefined;
		isLoaded = false;
	}

	$effect(() => {
		// Reading the source and `isLoaded` in one effect is what makes a
		// manual `load()` land the current CSS: the flag flips, the effect
		// re-runs, the element appears already up to date.
		const value = resolveGetter(css);
		text = value;
		if (isLoaded && el) el.textContent = value;
	});

	if (!manual) {
		$effect(() => {
			if (immediate) load();
			// Teardown returned from the effect that loads, so removal is tied to
			// this component's lifetime rather than to a timer or a watcher.
			return unload;
		});
	}

	return {
		id,
		get css() {
			return text;
		},
		set css(next: string) {
			text = next;
			// Written through immediately: a caller that passed a plain string has
			// no reactive source, so nothing else would ever flush this.
			if (el) el.textContent = next;
		},
		get isLoaded() {
			return isLoaded;
		},
		load,
		unload
	};
}
