import type {
	UseColorModeOptions,
	BasicColorSchema,
	BasicColorMode
} from '../useColorMode/index.svelte.ts';

import { useColorMode } from '../useColorMode/index.svelte.ts';

/** Options for {@link useDark}. */
export interface UseDarkOptions extends Omit<UseColorModeOptions, 'modes' | 'onChanged'> {
	/**
	 * Called on every mode change, in addition to the default DOM write.
	 * `mode` is the persisted mode, which may be `'auto'`.
	 */
	onChanged?: (
		isDark: boolean,
		defaultHandler: (mode: BasicColorMode) => void,
		mode: BasicColorSchema
	) => void;
	/**
	 * Class written in light mode. The default `''` removes the mode classes
	 * entirely rather than adding an empty-state class.
	 * @default ''
	 */
	valueLight?: string;
	/**
	 * Class written in dark mode.
	 * @default 'dark'
	 */
	valueDark?: string;
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
 * A thin boolean view over {@link useColorMode}: the mode class diffing, the
 * persistence and the OS query all live there, so the two utils cannot drift
 * into disagreeing about what "light" means on the same machine. Reach for
 * `useColorMode` directly when the raw `'auto'` state or a custom mode name
 * matters.
 *
 * @param opts `valueDark`, `valueLight`, `onChanged`, plus every `useColorMode` option except `modes`.
 * @returns Getter-backed `value` plus `toggle` and `setMode`.
 * @example
 * ```ts
 * const dark = useDark();
 * dark.toggle(); // light <-> dark (resolves auto first)
 *
 * const themed = useDark({ valueDark: 'night', attribute: 'data-theme' });
 * ```
 */
export function useDark(opts: UseDarkOptions = {}): UseDarkReturn {
	const { valueDark = 'dark', valueLight = '', attribute = 'class', onChanged, ...rest } = opts;

	const mode = useColorMode({
		...rest,
		attribute,
		// A non-class attribute receives the whole mode as its value, so light
		// has to spell out `light` there — the default empty `valueLight` would
		// write `data-theme=""` instead.
		modes:
			attribute === 'class'
				? { dark: valueDark, light: valueLight }
				: { dark: 'dark', light: 'light' },
		...(onChanged ? { onChanged: wrapDarkChanged(onChanged) } : {})
	});

	const isDark = $derived(mode.value === 'dark');

	return {
		get value() {
			return isDark;
		},
		toggle() {
			mode.value = isDark ? 'light' : 'dark';
		},
		setMode(next: UseDarkMode) {
			mode.value = next;
		}
	};
}

/** Adapt a dark-mode-aware `onChanged` to the color-mode signature. */
function wrapDarkChanged(
	onChanged: NonNullable<UseDarkOptions['onChanged']>
): NonNullable<UseColorModeOptions['onChanged']> {
	return (mode, defaultHandler) => {
		onChanged(mode === 'dark', defaultHandler, mode);
	};
}
