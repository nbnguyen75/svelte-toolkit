import type { MaybeGetter } from '../../shared/getter.ts';

import { SvelteMap, SvelteSet } from 'svelte/reactivity';

import { resolveGetter } from '../../shared/getter.ts';
import { isBrowser } from '../../shared/is.ts';
import { useEventListener } from '../useEventListener/index.svelte.ts';

/**
 * Shorthand property names, all lowercase. `{ ctrl: 'control' }` means
 * `magicKeys.ctrl` reads the same state as `magicKeys.control`.
 */
export const DEFAULT_MAGIC_KEYS_ALIAS_MAP: Readonly<Record<string, string>> = {
	ctrl: 'control',
	command: 'meta',
	cmd: 'meta',
	option: 'alt',
	up: 'arrowup',
	down: 'arrowdown',
	left: 'arrowleft',
	right: 'arrowright'
};

/** Options for {@link useMagicKeys}. */
export interface UseMagicKeysOptions {
	/**
	 * Called for every keydown and keyup, after the state has been updated.
	 * Useful for custom logic; the return value is ignored.
	 */
	onEventFired?: (event: KeyboardEvent) => void | boolean;
	/** Target to listen on. Window by default. */
	target?: MaybeGetter<EventTarget | null | undefined>;
	/**
	 * Shorthand names, all lowercase. Merged over
	 * {@link DEFAULT_MAGIC_KEYS_ALIAS_MAP}, so a partial map keeps the defaults.
	 */
	aliasMap?: Readonly<Record<string, string>>;
	/**
	 * Register passive listeners. Pass `false` if `onEventFired` calls
	 * `preventDefault()`.
	 * @default true
	 */
	passive?: boolean;
}

/**
 * Reactive pressed state for any key or `a_b` combination.
 *
 * The index signature covers every key name, so `magicKeys.ctrl_k` and
 * `magicKeys.alt` both typecheck, and `magicKeys.current` holds the raw pressed
 * keys. Use a combination in a condition (`if (magicKeys.ctrl_k)`), which
 * narrows on its own.
 *
 * No `reset()` is exposed: VueUse only calls its own on window blur/focus, so
 * adding a public one would be API this package cannot back with a VueUse
 * precedent — and a named member cannot coexist with the index signature anyway.
 */
export interface UseMagicKeysReturn {
	/**
	 * `true` while the key — or every key in a `+`/`-`/`_` separated combination —
	 * is held. Any property name is allowed; unknown keys read `false`.
	 */
	readonly [key: string]: boolean | ReadonlySet<string>;
	/** Raw keys currently held, e.g. `['control', 'k']`. */
	readonly current: ReadonlySet<string>;
}

/** Separators that turn one property name into a combination. */
const COMBINATION = /[+_-]/;

function isKeyboardEvent(event: Event): event is KeyboardEvent {
	return 'key' in event;
}

/**
 * Track which keys are held, including `ctrl+shift+p`-style combinations.
 *
 * Must be called in component initialization — the listeners attach in an
 * `$effect` and detach on unmount. No-op during SSR.
 *
 * @param options `target`, `aliasMap`, `passive`, `onEventFired`.
 * @example
 * ```ts
 * const magic = useMagicKeys();
 *
 * // in markup
 * {#if magic.ctrl_k}<span>⌘K / Ctrl+K</span>{/if}
 * ```
 */
export function useMagicKeys(options: UseMagicKeysOptions = {}): UseMagicKeysReturn {
	const { passive = true, onEventFired } = options;

	// Merged over the defaults so a partial alias map keeps the rest.
	const aliasMap: Record<string, string> = { ...DEFAULT_MAGIC_KEYS_ALIAS_MAP, ...options.aliasMap };

	/**
	 * `SvelteMap`, not a `$state` object: reading a property that was never set
	 * on a `$state` object subscribes to nothing, so `magicKeys.ctrl_k` would
	 * never re-run before the first keypress. `SvelteMap` tracks the version on a
	 * missing key, which is what makes combinations work on first read.
	 */
	const pressed = new SvelteMap<string, boolean>();

	/** Raw held keys. `SvelteSet` for the same missing-key reason. */
	const current = new SvelteSet<string>();

	/**
	 * Which keys were held while a given modifier was down, in press order.
	 *
	 * Plain arrays, not reactive collections: this is bookkeeping read only inside
	 * a listener, so a reactive `Set` here would be sources nobody reads. A
	 * handful of keys also beats a `Set`'s hashing.
	 */
	const depsMap: { Shift: string[]; Meta: string[]; Alt: string[] } = {
		Meta: [],
		Shift: [],
		Alt: []
	};

	function setKey(key: string, value: boolean): void {
		pressed.set(key, value);
	}

	function reset(): void {
		current.clear();
		pressed.clear();
	}

	/**
	 * Record which modifier is responsible for the keys held during this event.
	 * Browsers do not report "Shift is up" as a separate event, so without this
	 * a key pressed with Shift would stay stuck.
	 */
	function updateDeps(value: boolean, event: KeyboardEvent, keys: readonly string[]): void {
		if (!value || typeof event.getModifierState !== 'function') return;
		for (const [modifier, deps] of Object.entries(depsMap)) {
			if (!event.getModifierState(modifier)) continue;
			for (const key of keys) {
				if (!deps.includes(key)) deps.push(key);
			}
			return;
		}
	}

	/**
	 * Releasing Shift or Alt releases everything that was pressed with it, in
	 * press order, so `shift+a` reported before `shift+b` unwinds as `a` then `b`.
	 */
	function clearDeps(value: boolean, key: string): void {
		if (value) return;
		const deps = key === 'shift' ? depsMap.Shift : key === 'alt' ? depsMap.Alt : undefined;
		if (!deps) return;

		// Sliced rather than indexed: `noUncheckedIndexedAccess` makes every
		// `array[i]` `string | undefined`, and the slice reads clearer anyway.
		for (const dep of deps.slice(Math.max(deps.indexOf(key), 0))) {
			current.delete(dep);
			setKey(dep, false);
		}
		deps.length = 0;
	}

	function update(event: KeyboardEvent, value: boolean): void {
		const key = event.key.toLowerCase();
		if (!key) return;

		if (value) current.add(key);
		else current.delete(key);

		setKey(key, value);

		updateDeps(value, event, [...current, key]);
		clearDeps(value, key);

		// macOS does not fire keyup for keys held with Meta when Meta itself is
		// released, so release the combination by hand (#1312).
		if (key === 'meta' && !value) {
			for (const dep of depsMap.Meta) {
				current.delete(dep);
				setKey(dep, false);
			}
			depsMap.Meta.length = 0;
		}
	}

	const target = () =>
		options.target === undefined ? (isBrowser ? window : null) : resolveGetter(options.target);

	const passiveOptions = { passive };

	useEventListener(
		target,
		'keydown',
		(event) => {
			if (!isKeyboardEvent(event)) return;
			update(event, true);
			onEventFired?.(event);
		},
		passiveOptions
	);
	useEventListener(
		target,
		'keyup',
		(event) => {
			if (!isKeyboardEvent(event)) return;
			update(event, false);
			onEventFired?.(event);
		},
		passiveOptions
	);

	// Losing focus releases every key: no keyup ever arrives for what the user
	// was holding, and the modifiers genuinely are up.
	useEventListener(() => (isBrowser ? window : null), 'blur', reset, passiveOptions);
	useEventListener(() => (isBrowser ? window : null), 'focus', reset, passiveOptions);

	/**
	 * Any property name resolves to a boolean, so `magicKeys.anything` works and
	 * destructuring stays reactive: the reads happen inside whichever effect is
	 * reading, which is what tracks them. Nothing is created on first access —
	 * a missing key is simply `false`.
	 *
	 * `current` is on the target rather than only in the trap so the target
	 * satisfies the interface without an assertion, which this repo bans.
	 */
	const state: UseMagicKeysReturn = {
		get current() {
			return current;
		}
	};

	return new Proxy(state, {
		get(_target, property) {
			if (typeof property !== 'string') return undefined;
			if (property === 'current') return current;

			const name = property.toLowerCase();
			const aliased = aliasMap[name] ?? name;

			if (COMBINATION.test(aliased)) {
				const parts = aliased.split(COMBINATION).map((part) => part.trim());
				// `magicKeys._` would otherwise be permanently true on an empty list.
				if (parts.length === 0) return false;
				return parts.every((part) => pressed.get(aliasMap[part] ?? part) === true);
			}

			return pressed.get(aliased) === true;
		}
	});
}
