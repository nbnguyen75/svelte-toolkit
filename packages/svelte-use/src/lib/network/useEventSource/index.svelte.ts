import type { MaybeGetter } from '../../shared/getter.ts';

import { bindListener } from '../../browser/useEventListener/bind.ts';
import { resolveGetter } from '../../shared/getter.ts';
import { isMessageEvent, isBrowser, noop } from '../../shared/is.ts';

/** Connection states, matching the `EventSource` lifecycle. */
export type EventSourceStatus = 'CONNECTING' | 'OPEN' | 'CLOSED';

/** Options for {@link useEventSource}. */
export interface UseEventSourceOptions<Data> extends EventSourceInit {
	/**
	 * Reopen on failure. `true` retries forever with a 1s delay; an object
	 * tunes `retries` (count, or a predicate returning whether to retry),
	 * `delay` ms, and `onFailed` when retries run out.
	 *
	 * Only fires when the connection is refused (`readyState` closed) — a
	 * dropped connection that `EventSource` itself retries never reaches this.
	 *
	 * @default false
	 */
	autoReconnect?:
		| boolean
		| {
				retries?: number | (() => boolean);
				onFailed?: () => void;
				delay?: number;
		  };
	/**
	 * Convert the raw string into `Data`. Required when `Data` is not a string.
	 */
	serializer?: {
		read: (value?: string) => Data;
	};
	/**
	 * Reopen when the URL changes.
	 *
	 * @default true
	 */
	autoConnect?: boolean;
	/**
	 * Open on setup.
	 *
	 * @default true
	 */
	immediate?: boolean;
}

/** Reactive event-source state returned by {@link useEventSource}. */
export interface UseEventSourceReturn<Events extends string[], Data> {
	/** The live instance. Getter-backed. */
	readonly eventSource: EventSource | null;
	/** The latest named event. Getter-backed. */
	readonly event: Events[number] | null;
	/** The latest server-sent `lastEventId`. Getter-backed. */
	readonly lastEventId: string | null;
	/** `CONNECTING`, `OPEN`, or `CLOSED`. Getter-backed. */
	readonly status: EventSourceStatus;
	/** The latest error event. Getter-backed. */
	readonly error: Event | null;
	/** The latest payload received. Getter-backed. */
	readonly data: Data | null;
	/** Close gracefully. Further errors never reconnect. */
	close: () => void;
	/** Reopen, closing the current connection first. */
	open: () => void;
}

/**
 * Reactive Server-Sent Events client.
 *
 * Must be called in component initialization.
 *
 * @param url The stream URL, or a getter re-resolved when reconnecting. `undefined` opens nothing.
 * @param events Named events to listen for. Defaults to `['message']`.
 * @param options `autoReconnect`, `immediate`, `autoConnect`, `serializer`, plus `EventSourceInit`.
 * @returns `data`, `status`, `event`, `error`, `close`, `open`, `eventSource`, `lastEventId`.
 * @example
 * ```ts
 * import { useEventSource } from '@wynn-dev/svelte-use';
 *
 * const feed = useEventSource<['price'], string>(() => streamUrl, ['price'], { autoReconnect: true });
 * console.log(feed.data);
 * ```
 */
export function useEventSource<Events extends string[], Data = string>(
	url: MaybeGetter<string | URL | undefined>,
	events?: Events,
	options: UseEventSourceOptions<Data> = {}
): UseEventSourceReturn<Events, Data> {
	const {
		withCredentials = false,
		immediate = true,
		autoConnect = true,
		autoReconnect,
		serializer = {
			// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- upstream's default is `(v) => v as Data` too; sound when Data accepts strings (the default `Data = string`), otherwise pass a real serializer.
			read: (value?: string) => value as Data
		}
	} = options;

	let currentEvent = $state<Events[number] | null>(null);
	let data = $state<Data | null>(null);
	let status = $state<EventSourceStatus>('CONNECTING');
	let instance = $state<EventSource | null>(null);
	let error = $state<Event | null>(null);
	let lastEventId = $state<string | null>(null);

	let explicitlyClosed = false;
	let retried = 0;
	let retryTimer: ReturnType<typeof setTimeout> | undefined;
	const detachNamed: (() => void)[] = [];
	// Seeded at setup, not left undefined: the auto-connect effect below must
	// tell "URL changed since mount" from "first run". Upstream's `watch`
	// never fires initially; an undefined seed would reopen on mount instead.
	// Guarded — a URL getter may touch `window`, which does not exist here.
	let lastUrl: string | URL | undefined = isBrowser ? resolveGetter(url) : undefined;

	function clearRetry(): void {
		if (retryTimer !== undefined) {
			clearTimeout(retryTimer);
			retryTimer = undefined;
		}
	}

	function close(): void {
		if (!isBrowser || !instance) return;
		clearRetry();
		instance.close();
		instance = null;
		// A named listener belongs to its instance: drop them with it, or a
		// reopened stream accumulates a listener per generation.
		for (const detach of detachNamed.splice(0)) detach();
		status = 'CLOSED';
		explicitlyClosed = true;
	}

	function init(): void {
		if (explicitlyClosed) return;
		const target = resolveGetter(url);
		if (target === undefined) return;
		lastUrl = target;

		const source = new EventSource(target, { withCredentials });
		status = 'CONNECTING';
		instance = source;

		const detach = [
			bindListener(
				source,
				'open',
				() => {
					if (instance !== source) return;
					status = 'OPEN';
					error = null;
				},
				{ passive: true }
			),
			bindListener(
				source,
				'error',
				(e) => {
					status = 'CLOSED';
					error = e;

					// Only when refused outright (`readyState` closed): a dropped
					// connection that `EventSource` itself retries never reaches here.
					if (source.readyState === 2 && !explicitlyClosed && autoReconnect) {
						source.close();
						// `true` and `{}` mean the same thing with defaults; only an
						// object carries tuning.
						const nested = typeof autoReconnect === 'object' ? autoReconnect : undefined;
						const retries = nested?.retries ?? -1;
						const delay = nested?.delay ?? 1000;
						const onFailed = nested?.onFailed;
						retried += 1;

						if (typeof retries === 'number' && (retries < 0 || retried < retries)) {
							retryTimer = setTimeout(init, delay);
						} else if (typeof retries === 'function' && retries()) {
							retryTimer = setTimeout(init, delay);
						} else {
							onFailed?.();
						}
					}
				},
				{ passive: true }
			)
		];
		for (const off of detach) detachNamed.push(off);

		// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- 'message' is the SSE default event; callers naming other events pass them explicitly, so the default never collides with a named type.
		const names: Events = (events && events.length > 0 ? events : ['message']) as Events;
		for (const eventName of names) {
			detachNamed.push(
				bindListener(
					source,
					eventName,
					(e) => {
						if (!isMessageEvent(e)) return;
						currentEvent = eventName;
						// `data` on the DOM type is `any`; `typeof` narrows it to
						// a string without touching `any`, and the serializer
						// declares the rest — all concrete types, nothing generic.
						const text = typeof e.data === 'string' ? e.data : undefined;
						data = serializer.read(text) ?? null;
						lastEventId = e.lastEventId;
					},
					{ passive: true }
				)
			);
		}
	}

	function open(): void {
		if (!isBrowser) return;
		close();
		explicitlyClosed = false;
		retried = 0;
		init();
	}

	if (immediate) open();

	$effect(() => {
		if (!isBrowser || !autoConnect) return noop;
		// Tracked: a new URL reopens. Compared against the URL the live
		// connection was opened with, so mounting (where they match) opens
		// exactly once. Pass a stable value — a fresh `new URL()` per render
		// never matches and reconnects forever, same as upstream's watcher.
		const current = resolveGetter(url);
		if (current !== lastUrl) open();
		return noop;
	});

	$effect(() => {
		// Mount-only effect: no reactive reads, so it never re-runs. Unmount
		// drops the retry timer, the named listeners, and the connection.
		return () => {
			clearRetry();
			for (const detach of detachNamed.splice(0)) detach();
			close();
		};
	});

	return {
		get data() {
			return data;
		},
		get status() {
			return status;
		},
		get event() {
			return currentEvent;
		},
		get error() {
			return error;
		},
		close,
		open,
		get eventSource() {
			return instance;
		},
		get lastEventId() {
			return lastEventId;
		}
	};
}
