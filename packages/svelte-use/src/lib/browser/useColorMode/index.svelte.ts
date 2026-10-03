import type { MaybeGetter } from '../../shared/getter.ts';

import { MediaQuery } from 'svelte/reactivity';

import { resolveGetter } from '../../shared/getter.ts';
import { isBrowser } from '../../shared/is.ts';
import { useStorage } from '../../state/useStorage/index.svelte.ts';

/** The two concrete modes. */
export type BasicColorMode = 'light' | 'dark';

/** A concrete mode, or `auto` to defer to the OS preference. */
export type BasicColorSchema = BasicColorMode | 'auto';

/** Writable cell accepted by `storageRef`; {@link useStorage}'s return fits. */
export interface ColorModeStore<T extends string = BasicColorMode> {
	/** Persisted mode, possibly `'auto'`. */
	value: T | BasicColorSchema;
}

/** Options for {@link useColorMode}. */
export interface UseColorModeOptions<T extends string = BasicColorMode> {
	/**
	 * Intercept each mode change. Call `defaultHandler` to keep the default DOM
	 * write; returning without calling it suppresses the update entirely.
	 */
	onChanged?: (
		mode: T | BasicColorMode,
		defaultHandler: (mode: T | BasicColorMode) => void
	) => void;
	/**
	 * CSS selector, or an element, that receives the mode.
	 * @default 'html'
	 */
	selector?: string | MaybeGetter<HTMLElement | null | undefined>;
	/**
	 * Mode-to-class/attribute overrides, merged over the defaults
	 * (`auto: ''`, `light: 'light'`, `dark: 'dark'`). A mode with no entry falls
	 * through to the raw mode string.
	 */
	modes?: Partial<Record<T | BasicColorSchema, string>>;
	/**
	 * Mode used until something is persisted. Cannot be a getter: the storage
	 * layer needs a plain value to write on first run.
	 * @default 'auto'
	 */
	initialValue?: T | BasicColorSchema;
	/** Existing cell to persist through, instead of creating a storage-backed one. */
	storageRef?: ColorModeStore<T>;
	/**
	 * Suppress CSS transitions while the mode switches, by injecting a
	 * `transition: none` stylesheet around the write.
	 * @default true
	 * @see https://paco.me/writing/disable-theme-transitions
	 */
	disableTransition?: boolean;
	/**
	 * Storage key. `null` keeps the mode in memory only.
	 * @default 'svelte-use-color-scheme'
	 */
	storageKey?: string | null;
	/** Storage accessor. @default () => localStorage */
	storage?: () => Storage;
	/**
	 * How the mode reaches the DOM. `'class'` diffs the mode classes, leaving
	 * every other class on the element alone; any other name writes the whole
	 * mode as that attribute's value.
	 * @default 'class'
	 */
	attribute?: string;
}

/** Reactive color-mode controller returned by {@link useColorMode}. */
export interface UseColorModeReturn<T extends string = BasicColorMode> {
	/** The persisted value, which may still be `'auto'`. */
	readonly store: T | BasicColorSchema;
	/** `store` with `'auto'` resolved through `system`. */
	readonly state: T | BasicColorMode;
	/** The OS preference resolved to a concrete mode. */
	readonly system: BasicColorMode;
	/**
	 * Alias for `state`; assigning persists a new mode. The setter also accepts
	 * `'auto'`, which is how a caller returns to following the OS.
	 */
	value: T | BasicColorSchema;
}

const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

const DISABLE_TRANSITIONS =
	'*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}';

const DEFAULT_MODES: Record<BasicColorSchema, string> = { auto: '', light: 'light', dark: 'dark' };

/** In-memory cell used when `storageKey` is `null`. */
function createMemoryStore<T extends string>(initialValue: T): ColorModeStore<T> {
	let value = $state<T>(initialValue);
	return {
		get value() {
			return value;
		},
		set value(next: T) {
			value = next;
		}
	};
}

/**
 * Reading a computed property is what forces the browser to flush the pending
 * style change, which is how the injected transition block takes effect before
 * the mode lands.
 */
function forceReflow(el: Element): void {
	getComputedStyle(el).getPropertyValue('opacity');
}

/**
 * Reactive color mode with persistence and an `auto` value that follows the OS
 * preference.
 *
 * The three accessors are deliberately distinct: `store` is what was persisted
 * (and may be `'auto'`), `system` is what the OS wants, and `state` is the mode
 * actually in effect. A theme switcher needs all three — collapsing them is
 * what makes an "explicitly chose light on a light OS" state indistinguishable
 * from "following the OS".
 *
 * On the server nothing is written and `state` falls back to `system`; the DOM
 * write happens in an `$effect`, so it only ever runs in the browser.
 *
 * @param options `selector`, `attribute`, `initialValue`, `modes`, `onChanged`, `storageRef`, `storageKey`, `storage`, `disableTransition`.
 * @returns Getter-backed `system` / `store` / `state`, plus a writable `value`.
 * @example
 * ```ts
 * const mode = useColorMode({ selector: 'html' });
 *
 * mode.value = 'dark'; // persists and applies the dark class
 * mode.state; // 'dark'
 * mode.store; // 'dark'
 * mode.system; // what the OS prefers, independent of the choice above
 * ```
 */
export function useColorMode<T extends string = BasicColorMode>(
	options: UseColorModeOptions<T> = {}
): UseColorModeReturn<T> {
	const {
		selector = 'html',
		attribute = 'class',
		initialValue = 'auto',
		storageKey = 'svelte-use-color-scheme',
		disableTransition = true
	} = options;

	const modes: Record<string, string> = { ...DEFAULT_MODES, ...options.modes };

	// One `MediaQuery` per caller, built inside the factory so no instance is
	// shared across callers or requests (scope.md §2). The constructor touches
	// `window.matchMedia`, and `MediaQuery` resolves to a stub on the server.
	const prefersDark = isBrowser ? new MediaQuery(DARK_MEDIA_QUERY, false) : null;

	const system = $derived<BasicColorMode>(prefersDark?.current ? 'dark' : 'light');

	const store: ColorModeStore<T | BasicColorSchema> =
		options.storageRef ??
		(storageKey === null
			? createMemoryStore<T | BasicColorSchema>(initialValue)
			: useStorage<T | BasicColorSchema>(
					storageKey,
					initialValue,
					options.storage ?? (() => localStorage)
				));

	const state = $derived<T | BasicColorMode>(store.value === 'auto' ? system : store.value);

	function resolveTarget(): HTMLElement | null {
		if (typeof selector === 'string') return document.querySelector<HTMLElement>(selector);
		return resolveGetter(selector) ?? null;
	}

	function defaultHandler(mode: T | BasicColorMode): void {
		const el = isBrowser ? resolveTarget() : null;
		if (!el) return;

		const value = modes[mode] ?? mode;
		let attributeValue: string | null = null;
		let toAdd: string[] = [];
		let toRemove: string[] = [];

		if (attribute === 'class') {
			// Every class any mode could claim, versus the ones this mode claims.
			// A class in both is kept; one only the modes mention is removed. That
			// is what leaves the element's own classes untouched.
			const candidates = Object.values(modes)
				.flatMap((entry) => entry.split(/\s/g))
				.filter(Boolean);
			const current = value.split(/\s/g);
			toAdd = candidates.filter((candidate) => current.includes(candidate));
			toRemove = candidates.filter((candidate) => !current.includes(candidate));
		} else {
			attributeValue = value;
		}

		// Nothing to change: bail before injecting the style block, so an
		// unchanged mode never forces the page to reflow.
		if (toAdd.length === 0 && toRemove.length === 0 && attributeValue === null) return;

		let block: HTMLStyleElement | null = null;
		if (disableTransition) {
			block = document.createElement('style');
			block.appendChild(document.createTextNode(DISABLE_TRANSITIONS));
			document.head.appendChild(block);
		}

		for (const candidate of toAdd) el.classList.add(candidate);
		for (const candidate of toRemove) el.classList.remove(candidate);
		if (attributeValue !== null) el.setAttribute(attribute, attributeValue);

		if (block) {
			forceReflow(block);
			block.remove();
		}
	}

	$effect(() => {
		const mode = state;
		if (options.onChanged) options.onChanged(mode, defaultHandler);
		else defaultHandler(mode);
	});

	return {
		get system() {
			return system;
		},
		get store() {
			return store.value;
		},
		get state() {
			return state;
		},
		get value() {
			return state;
		},
		set value(next: T | BasicColorSchema) {
			store.value = next;
		}
	};
}
