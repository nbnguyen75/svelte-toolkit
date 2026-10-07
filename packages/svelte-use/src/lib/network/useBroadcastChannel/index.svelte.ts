import { bindListener } from '../../browser/useEventListener/bind.ts';
import { isMessageEvent, isBrowser, noop } from '../../shared/is.ts';

/** Options for {@link useBroadcastChannel}. */
export interface UseBroadcastChannelOptions {
	/** The channel name. Tabs on the same origin with the same name hear each other. */
	name: string;
}

/** Reactive broadcast state returned by {@link useBroadcastChannel}. */
export interface UseBroadcastChannelReturn<D, P> {
	/** The live channel, once opened. Getter-backed. */
	readonly channel: BroadcastChannel | undefined;
	/** Whether `BroadcastChannel` exists. `false` during SSR. */
	readonly isSupported: boolean;
	/** The latest payload received. Getter-backed. */
	readonly data: D | undefined;
	/** The latest `messageerror` event. Getter-backed. */
	readonly error: Event | null;
	/** Whether the channel has been closed. Getter-backed. */
	readonly isClosed: boolean;
	/** Post to every other listener on the channel. No-op before open. */
	post: (data: P) => void;
	/** Close the channel. Idempotent. */
	close: () => void;
}

/**
 * Reactive `BroadcastChannel`: tabs on the same origin, same channel name,
 * hear each other's posts.
 *
 * Must be called in component initialization.
 *
 * @param options `name`.
 * @returns `isSupported`, `channel`, `data`, `post`, `close`, `error`, `isClosed`.
 * @example
 * ```ts
 * import { useBroadcastChannel } from '@wynn-dev/svelte-use';
 *
 * const bus = useBroadcastChannel<string, string>({ name: 'theme' });
 * bus.post('dark');
 * console.log(bus.data);
 * ```
 */
export function useBroadcastChannel<D, P>(
	options: UseBroadcastChannelOptions
): UseBroadcastChannelReturn<D, P> {
	const { name } = options;
	// `typeof`, not `in`: a stub can expose the name as `undefined`, which
	// `in` accepts and `new` then throws on.
	const isSupported = isBrowser && typeof BroadcastChannel === 'function';

	let channel = $state<BroadcastChannel | undefined>(undefined);
	let data = $state<D | undefined>(undefined);
	let error = $state<Event | null>(null);
	let isClosed = $state(false);

	function post(payload: P): void {
		// `postMessage` on a `BroadcastChannel` takes only the payload — there
		// is no target origin (same-origin by construction). The
		// `require-post-message-target-origin` rule cannot tell it apart from
		// `window.postMessage`, so it is silenced here, not obeyed.
		// oxlint-disable-next-line unicorn/require-post-message-target-origin -- BroadcastChannel.postMessage(message) has no targetOrigin parameter; same-origin is structural.
		channel?.postMessage(payload);
	}

	function close(): void {
		channel?.close();
		isClosed = true;
	}

	$effect(() => {
		if (!isSupported) return noop;
		error = null;
		isClosed = false;
		const next = new BroadcastChannel(name);
		channel = next;
		const off = [
			bindListener(
				next,
				'message',
				(e) => {
					if (!isMessageEvent(e)) return;
					// oxlint-disable-next-line typescript/no-unsafe-assignment -- MessageEvent.data is typed `any` in lib.dom; the caller names D, so this assignment is the documented boundary. Same rationale as useCloned's single cast.
					data = e.data;
				},
				{ passive: true }
			),
			bindListener(
				next,
				'messageerror',
				(e) => {
					error = e;
				},
				{ passive: true }
			)
		];
		return () => {
			for (const detach of off) detach();
			next.close();
			// Writes still apply during teardown; the channel is gone either way.
			isClosed = true;
		};
	});

	return {
		isSupported,
		get channel() {
			return channel;
		},
		get data() {
			return data;
		},
		post,
		close,
		get error() {
			return error;
		},
		get isClosed() {
			return isClosed;
		}
	};
}
