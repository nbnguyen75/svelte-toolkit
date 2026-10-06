import { SvelteURLSearchParams, SvelteSet } from 'svelte/reactivity';

import { bindListener } from '../../browser/useEventListener/bind.ts';
import { isBrowser, noop } from '../../shared/is.ts';

/** Where the params live in the URL. */
export type UrlSearchParamsMode = 'history' | 'hash' | 'hash-params';

/** Param values: one string, or a list when a key repeats. */
export type UrlParams = Record<string, string[] | string>;

/** Options for {@link useUrlSearchParams}. */
export interface UseUrlSearchParamsOptions {
	/**
	 * Custom serializer; receives the params and returns the query string
	 * without a leading `?` or `#`.
	 */
	stringify?: (params: URLSearchParams) => string;
	/**
	 * `replace` rewrites the current history entry, `push` adds one.
	 *
	 * @default 'replace'
	 */
	writeMode?: 'replace' | 'push';
	/**
	 * Drop keys whose value is `null` or `undefined` when writing.
	 *
	 * @default true
	 */
	removeNullishValues?: boolean;
	/**
	 * Drop keys whose value is falsy when writing.
	 *
	 * @default false
	 */
	removeFalsyValues?: boolean;
	/**
	 * Starting state when the URL holds no params.
	 *
	 * @default {}
	 */
	initialValue?: UrlParams;
	/**
	 * Read external URL changes (back/forward) into the state.
	 *
	 * @default true
	 */
	write?: boolean;
}

/**
 * Reactive URL search params, synced both ways with the address bar.
 *
 * The returned record IS the state: read and assign its keys directly. There
 * is no getter wrapper, because the keys are dynamic.
 *
 * Must be called in component initialization.
 *
 * @param mode Where the params live: the query string, the hash query, or the whole hash.
 * @param options `removeNullishValues`, `removeFalsyValues`, `initialValue`, `write`, `writeMode`, `stringify`.
 * @returns The params record itself.
 * @example
 * ```ts
 * import { useUrlSearchParams } from '@wynn-dev/svelte-use';
 *
 * const params = useUrlSearchParams('history');
 * params.page = '2';
 * console.log(params.page);
 * ```
 */
export function useUrlSearchParams(
	mode: UrlSearchParamsMode = 'history',
	options: UseUrlSearchParamsOptions = {}
): UrlParams {
	const {
		initialValue = {},
		removeNullishValues = true,
		removeFalsyValues = false,
		write: enableWrite = true,
		writeMode = 'replace',
		stringify = (params) => params.toString()
	} = options;

	const state: UrlParams = $state({ ...initialValue });

	// Set by the listener effect below once the initial URL has been read into
	// the state. The write-back effect is created first and therefore runs
	// first; without this flag, mounting alone would write the still-empty
	// state back over the URL (and push a duplicate entry in `push` mode).
	let initialized = false;
	// Keys currently mirrored from the URL. Plain, not state: `updateState`
	// runs inside effects, which may not read the state they write.
	let knownKeys = new SvelteSet<string>();

	function getRawParams(): string {
		if (mode === 'history') return window.location.search || '';
		if (mode === 'hash') {
			const hash = window.location.hash || '';
			const index = hash.indexOf('?');
			return index > 0 ? hash.slice(index) : '';
		}
		return (window.location.hash || '').replace(/^#/, '');
	}

	function constructQuery(params: URLSearchParams): string {
		const stringified = stringify(params);
		if (mode === 'history')
			return `${stringified ? `?${stringified}` : ''}${window.location.hash || ''}`;
		if (mode === 'hash-params')
			return `${window.location.search || ''}${stringified ? `#${stringified}` : ''}`;
		const hash = window.location.hash || '#';
		const index = hash.indexOf('?');
		if (index > 0)
			return `${window.location.search || ''}${hash.slice(0, index)}${stringified ? `?${stringified}` : ''}`;
		return `${window.location.search || ''}${hash}${stringified ? `?${stringified}` : ''}`;
	}

	function read(): URLSearchParams {
		return new SvelteURLSearchParams(getRawParams());
	}

	function updateState(params: URLSearchParams): void {
		// Keys are tracked in a plain set, not read back from `state`: this runs
		// inside effects, and an effect that reads `Object.keys(state)` while
		// also writing `state` invalidates itself forever
		// (`effect_update_depth_exceeded`).
		const next = new SvelteSet<string>();
		for (const key of params.keys()) {
			const values = params.getAll(key);
			state[key] = values.length > 1 ? values : (params.get(key) ?? '');
			next.add(key);
		}
		for (const key of knownKeys) {
			if (!next.has(key)) delete state[key];
		}
		knownKeys = next;
	}

	function writeHistory(params: URLSearchParams): void {
		const url = window.location.pathname + constructQuery(params);
		if (writeMode === 'replace')
			window.history.replaceState(window.history.state, window.document.title, url);
		else window.history.pushState(window.history.state, window.document.title, url);
	}

	$effect(() => {
		if (!isBrowser) return;
		// Serialize the live state. Every key and value read here subscribes
		// this effect, so any edit re-runs it; the history write below touches
		// no state, so the effect never invalidates itself.
		const params = new SvelteURLSearchParams('');
		for (const key of Object.keys(state)) {
			const entry = state[key];
			if (entry === undefined) {
				// Only reachable from untyped callers: the type promises
				// `string | string[]`, and `Object.keys` only yields present
				// keys. `String(entry)` matches upstream's implicit
				// stringification rather than inventing a new rule for it.
				if (removeNullishValues) params.delete(key);
				else params.set(key, String(entry));
			} else if (Array.isArray(entry)) {
				for (const value of entry) params.append(key, value);
			} else if (removeFalsyValues && !entry) {
				params.delete(key);
			} else {
				params.set(key, entry);
			}
		}
		// Skip when already in sync: the initial read, or a state that just
		// came FROM the URL, must not write back (and in `push` mode that
		// write would duplicate the entry). Not initialized yet either: the
		// initial read below has not run, so there is nothing to write.
		if (!initialized || stringify(params) === stringify(read())) return;
		writeHistory(params);
	});

	$effect(() => {
		if (!isBrowser) return noop;
		const initial = read();
		if (initial.keys().next().value) updateState(initial);
		else Object.assign(state, initialValue);
		initialized = true;

		const onChanged = (): void => {
			if (!enableWrite) return;
			updateState(read());
		};
		const off = [bindListener(window, 'popstate', onChanged, { passive: true })];
		if (mode !== 'history')
			off.push(bindListener(window, 'hashchange', onChanged, { passive: true }));
		return () => {
			for (const detach of off) detach();
		};
	});

	return state;
}
