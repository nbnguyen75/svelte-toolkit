import { bindListener } from '../../browser/useEventListener/bind.ts';
import { isBrowser, noop } from '../../shared/is.ts';

/** Which navigation produced the current snapshot. */
export type BrowserLocationTrigger = 'load' | 'popstate' | 'hashchange';

/** A snapshot of the browser location. */
export interface BrowserLocationState {
	readonly trigger: BrowserLocationTrigger;
	readonly state?: unknown;
	readonly length?: number;
	readonly origin?: string;
	hostname?: string;
	pathname?: string;
	protocol?: string;
	search?: string;
	hash?: string;
	host?: string;
	href?: string;
	port?: string;
}

/** Reactive browser location returned by {@link useBrowserLocation}. */
export interface UseBrowserLocationReturn {
	/** Which navigation produced the snapshot. Getter-backed. */
	readonly trigger: BrowserLocationTrigger;
	/** `history.length` at snapshot time. Getter-backed. */
	readonly length: number | undefined;
	/** `location.origin` at snapshot time. Getter-backed. */
	readonly origin: string | undefined;
	hostname: string | undefined;
	pathname: string | undefined;
	protocol: string | undefined;
	search: string | undefined;
	/** Each writable part reads live and writes through to `location`. */
	hash: string | undefined;
	host: string | undefined;
	href: string | undefined;
	port: string | undefined;
	/** `history.state` at snapshot time. Getter-backed. */
	readonly state: unknown;
}

const WRITABLE_KEYS = [
	'hash',
	'host',
	'hostname',
	'href',
	'pathname',
	'port',
	'protocol',
	'search'
] as const;

/**
 * Assign a writable URL part through to `window.location`.
 *
 * Module scope: it captures nothing from the util, only globals. Skips the
 * write when already equal — assigning `location.href` navigates, and even
 * the harmless parts re-fire `hashchange` for nothing.
 */
function writeLocationPart(key: (typeof WRITABLE_KEYS)[number], next: string | undefined): void {
	if (!isBrowser || next === undefined) return;
	if (window.location[key] === next) return;
	window.location[key] = next;
}

/** Read the current location into a snapshot. `undefined` fields off the browser. */
function readLocation(trigger: BrowserLocationTrigger): BrowserLocationState {
	if (!isBrowser) return { trigger };
	return {
		trigger,
		state: window.history.state,
		length: window.history.length,
		origin: window.location.origin,
		hash: window.location.hash,
		host: window.location.host,
		hostname: window.location.hostname,
		href: window.location.href,
		pathname: window.location.pathname,
		port: window.location.port,
		protocol: window.location.protocol,
		search: window.location.search
	};
}

/**
 * Reactive browser location, rebuilt on every navigation.
 *
 * Must be called in component initialization.
 *
 * @returns The location snapshot: `trigger`, `state`, `length`, `origin`,
 * plus the 8 writable URL parts, which assign through to `window.location`.
 * @example
 * ```ts
 * import { useBrowserLocation } from '@wynn-dev/svelte-use';
 *
 * const location = useBrowserLocation();
 * console.log(location.pathname);
 * ```
 */
export function useBrowserLocation(): UseBrowserLocationReturn {
	let snapshot = $state<BrowserLocationState>(readLocation('load'));

	$effect(() => {
		snapshot = readLocation('load');
		if (!isBrowser) return noop;
		const off = [
			bindListener(
				window,
				'popstate',
				() => {
					snapshot = readLocation('popstate');
				},
				{ passive: true }
			),
			bindListener(
				window,
				'hashchange',
				() => {
					snapshot = readLocation('hashchange');
				},
				{ passive: true }
			)
		];
		return () => {
			for (const detach of off) detach();
		};
	});

	return {
		get trigger() {
			return snapshot.trigger;
		},
		get state() {
			return snapshot.state;
		},
		get length() {
			return snapshot.length;
		},
		get origin() {
			return snapshot.origin;
		},
		get hash() {
			return snapshot.hash;
		},
		set hash(next: string | undefined) {
			writeLocationPart('hash', next);
		},
		get host() {
			return snapshot.host;
		},
		set host(next: string | undefined) {
			writeLocationPart('host', next);
		},
		get hostname() {
			return snapshot.hostname;
		},
		set hostname(next: string | undefined) {
			writeLocationPart('hostname', next);
		},
		get href() {
			return snapshot.href;
		},
		set href(next: string | undefined) {
			writeLocationPart('href', next);
		},
		get pathname() {
			return snapshot.pathname;
		},
		set pathname(next: string | undefined) {
			writeLocationPart('pathname', next);
		},
		get port() {
			return snapshot.port;
		},
		set port(next: string | undefined) {
			writeLocationPart('port', next);
		},
		get protocol() {
			return snapshot.protocol;
		},
		set protocol(next: string | undefined) {
			writeLocationPart('protocol', next);
		},
		get search() {
			return snapshot.search;
		},
		set search(next: string | undefined) {
			writeLocationPart('search', next);
		}
	};
}
