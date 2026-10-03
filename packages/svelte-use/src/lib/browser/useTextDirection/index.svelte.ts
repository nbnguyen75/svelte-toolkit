import { isBrowser } from '../../shared/is.ts';

/** The `dir` attribute values {@link useTextDirection} understands. */
export type UseTextDirectionValue = 'auto' | 'ltr' | 'rtl';

/** Options for {@link useTextDirection}. */
export interface UseTextDirectionOptions {
	/**
	 * Value reported before hydration, and whenever the element carries no
	 * usable `dir` attribute.
	 * @default 'ltr'
	 */
	initialValue?: UseTextDirectionValue;
	/**
	 * Watch the target with a `MutationObserver` and re-read `dir` when it
	 * changes. Off by default: without it, `value` only changes through this
	 * util's own setter.
	 * @default false
	 */
	observe?: boolean;
	/**
	 * Selector for the element carrying `dir`.
	 * @default 'html'
	 */
	selector?: string;
}

/** Reactive result of {@link useTextDirection}. */
export interface UseTextDirectionReturn {
	/** Current direction. Writable: assigning writes the `dir` attribute. */
	value: UseTextDirectionValue;
}

/** Only these three attribute values are accepted; anything else is ignored. */
function toDirection(raw: string | null | undefined, fallback: UseTextDirectionValue) {
	return raw === 'rtl' || raw === 'auto' ? raw : fallback;
}

const noop = () => {};

/**
 * Reactive `dir` attribute of an element.
 *
 * Reads the `dir` **attribute**, not the computed `direction`, matching VueUse —
 * so a stylesheet-only `direction: rtl` is not reported. Writing `value` sets
 * the attribute; passing `observe` additionally keeps it in sync when something
 * else changes `dir`.
 *
 * Unlike VueUse's blind cast to `UseTextDirectionValue`, an unrecognised
 * attribute value falls back to `initialValue` instead of leaking through.
 *
 * On the server `value` is `initialValue` and no DOM is touched. VueUse
 * additionally re-reads on mount; in Svelte the factory already runs on the
 * client, so that pass would be redundant.
 *
 * @param opts `initialValue`, `observe`, and `selector` overrides.
 * @returns Writable `value`.
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useTextDirection } from '@wynn-dev/svelte-use';
 *
 *   const dir = useTextDirection({ observe: true });
 * </script>
 *
 * <p>direction: {dir.value}</p>
 * <button onclick={() => (dir.value = 'rtl')}>flip</button>
 * ```
 */
export function useTextDirection(opts: UseTextDirectionOptions = {}): UseTextDirectionReturn {
	const initialValue = opts.initialValue ?? 'ltr';
	const observe = opts.observe ?? false;
	const selector = opts.selector ?? 'html';

	function read(): UseTextDirectionValue {
		if (!isBrowser) return initialValue;
		return toDirection(document.querySelector(selector)?.getAttribute('dir'), initialValue);
	}

	let current = $state<UseTextDirectionValue>(read());

	$effect(() => {
		const el = observe && isBrowser ? document.querySelector(selector) : null;
		// Mirrors useEventListener: return a callable so every path leaves a
		// valid teardown (a bare `return` trips `consistent-return`).
		if (el === null) return noop;
		const observer = new MutationObserver(() => {
			current = read();
		});
		observer.observe(el, { attributes: true });
		return () => {
			observer.disconnect();
		};
	});

	return {
		get value() {
			return current;
		},
		set value(next: UseTextDirectionValue) {
			current = next;
			if (isBrowser) document.querySelector(selector)?.setAttribute('dir', next);
		}
	};
}
