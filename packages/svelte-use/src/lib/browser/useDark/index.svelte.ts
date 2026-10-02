import { MediaQuery } from 'svelte/reactivity';

import { isBrowser } from '../../shared/is.ts';
import { useLocalStorage } from '../../state/useStorage/index.svelte.ts';

const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

/** Options for {@link useDark}. */
export interface UseDarkOptions {
	/**
	 * Storage key for the persisted color-scheme mode.
	 * @default 'svelte-use-color-scheme'
	 */
	storageKey?: string;
	/**
	 * Attribute to write on the selector target; `'class'` toggles the
	 * `dark` class, any other name sets `attribute="dark" | "light"`.
	 * @default 'class'
	 */
	attribute?: string;
	/**
	 * Element selector receiving the dark-mode marker.
	 * @default 'html'
	 */
	selector?: string;
}

/** Color-scheme mode persisted by {@link useDark}. */
export type UseDarkMode = 'light' | 'dark' | 'auto';

/** Reactive dark-mode state returned by {@link useDark}. */
export interface UseDarkReturn {
	/** Persist a mode, or return to OS-driven `auto`. */
	setMode: (mode: UseDarkMode) => void;
	/** Effective dark state (stored mode, or OS preference in `auto`). Getter-backed (destructure-safe). */
	readonly value: boolean;
	/** Flip between explicit `light` and `dark` (resolves `auto` first). */
	toggle: () => void;
}

/**
 * Dark-mode controller. During SSR the value is `false` and no DOM or
 * storage is touched; the client hydrates from storage, then OS preference.
 *
 * @param opts `storageKey`, `attribute`, and `selector` overrides.
 * @returns Getter-backed `value` plus `toggle` and `setMode`.
 * @example
 * ```ts
 * const dark = useDark();
 * dark.toggle(); // light <-> dark (resolves auto first)
 * ```
 */
export function useDark(opts: UseDarkOptions = {}): UseDarkReturn {
	const storageKey = opts.storageKey ?? 'svelte-use-color-scheme';
	const selector = opts.selector ?? 'html';
	const attribute = opts.attribute ?? 'class';

	// One `MediaQuery` per caller, built inside the factory so no instance is
	// shared across callers or requests (scope.md §2). Its constructor touches
	// `window.matchMedia`, so it cannot be constructed during SSR — `MediaQuery`
	// resolves to a stub there anyway (scope.md §5.2).
	const prefersDark = isBrowser ? new MediaQuery(DARK_MEDIA_QUERY, false) : null;

	const stored = useLocalStorage<UseDarkMode>(storageKey, 'auto');

	const isDark = $derived(
		stored.value === 'auto' ? (prefersDark?.current ?? false) : stored.value === 'dark'
	);

	$effect(() => {
		if (!isBrowser) return;
		const el = document.querySelector(selector);
		if (!el) return;

		if (attribute === 'class') {
			el.classList.toggle('dark', isDark);
		} else {
			el.setAttribute(attribute, isDark ? 'dark' : 'light');
		}
	});

	return {
		get value() {
			return isDark;
		},
		toggle() {
			stored.value = isDark ? 'light' : 'dark';
		},
		setMode(mode: UseDarkMode) {
			stored.value = mode;
		}
	};
}
