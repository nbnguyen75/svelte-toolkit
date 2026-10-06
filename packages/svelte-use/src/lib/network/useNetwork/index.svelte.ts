import { bindListener } from '../../browser/useEventListener/bind.ts';
import { isBrowser, noop } from '../../shared/is.ts';

/** Connection kinds, matching the Network Information API. */
export type NetworkType =
	| 'bluetooth'
	| 'cellular'
	| 'ethernet'
	| 'none'
	| 'wifi'
	| 'wimax'
	| 'other'
	| 'unknown';

/** Effective connection kinds, matching the Network Information API. */
export type NetworkEffectiveType = 'slow-2g' | '2g' | '3g' | '4g' | undefined;

/**
 * The Network Information API surface this util reads. `navigator.connection`
 * is untyped in lib.dom, so every property is optional and the object itself
 * is probed structurally before use.
 */
interface NetworkInformation {
	readonly effectiveType?: NetworkEffectiveType | undefined;
	readonly downlinkMax?: number | undefined;
	readonly saveData?: boolean | undefined;
	readonly type?: NetworkType | undefined;
	readonly downlink?: number | undefined;
	readonly rtt?: number | undefined;
}

/**
 * Narrows `navigator.connection` to something usable.
 *
 * Checks both the info surface (`downlink`) and the listener surface
 * (`addEventListener`): a stub exposing the name but neither capability is
 * not a connection, and binding to it would throw.
 */
function isNetworkInformation(value: unknown): value is EventTarget & NetworkInformation {
	return (
		typeof value === 'object' &&
		value !== null &&
		'downlink' in value &&
		'addEventListener' in value
	);
}

/** The usable connection object, or `null` off the browser or without the API. */
function readConnection(): (EventTarget & NetworkInformation) | null {
	if (!isBrowser) return null;
	if (!('connection' in navigator)) return null;
	const candidate: unknown = navigator.connection;
	return isNetworkInformation(candidate) ? candidate : null;
}

/** Reactive network state returned by {@link useNetwork}. */
export interface UseNetworkReturn {
	/** Detected effective speed type. Getter-backed. */
	readonly effectiveType: NetworkEffectiveType | undefined;
	/** Max reachable download speed in Mbps. Getter-backed. */
	readonly downlinkMax: number | undefined;
	/** When the browser last went offline. Getter-backed. */
	readonly offlineAt: number | undefined;
	/** Whether data-saver mode is on. Getter-backed. */
	readonly saveData: boolean | undefined;
	/** When the browser last came online. Getter-backed. */
	readonly onlineAt: number | undefined;
	/** Download speed in Mbps. Getter-backed. */
	readonly downlink: number | undefined;
	/** Estimated round-trip time in ms. Getter-backed. */
	readonly rtt: number | undefined;
	/** Whether the Network Information API is usable. `false` during SSR. */
	readonly isSupported: boolean;
	/** Whether the browser reports itself online. Getter-backed. */
	readonly isOnline: boolean;
	/** Detected connection type. Getter-backed. */
	readonly type: NetworkType;
}

/**
 * Reactive network status: online/offline plus the Network Information API.
 *
 * Must be called in component initialization.
 *
 * @returns `isSupported`, `isOnline`, `offlineAt`, `onlineAt`, `downlink`,
 * `downlinkMax`, `effectiveType`, `rtt`, `saveData`, and `type`.
 * @example
 * ```ts
 * import { useNetwork } from '@wynn-dev/svelte-use';
 *
 * const net = useNetwork();
 * console.log(net.isOnline, net.effectiveType);
 * ```
 */
export function useNetwork(): UseNetworkReturn {
	const connection = readConnection();
	const isSupported = connection !== null;

	let isOnline = $state(true);
	let offlineAt = $state<number | undefined>(undefined);
	let onlineAt = $state<number | undefined>(undefined);
	let downlink = $state<number | undefined>(undefined);
	let downlinkMax = $state<number | undefined>(undefined);
	let effectiveType = $state<NetworkEffectiveType | undefined>(undefined);
	let rtt = $state<number | undefined>(undefined);
	let saveData = $state<boolean | undefined>(false);
	let type = $state<NetworkType>('unknown');

	function update(): void {
		if (!isBrowser) return;
		isOnline = navigator.onLine;
		offlineAt = isOnline ? undefined : Date.now();
		onlineAt = isOnline ? Date.now() : undefined;
		if (connection) {
			downlink = connection.downlink;
			downlinkMax = connection.downlinkMax;
			effectiveType = connection.effectiveType;
			rtt = connection.rtt;
			saveData = connection.saveData;
			// `?? 'unknown'`: the probe guarantees the surface, not every key.
			type = connection.type ?? 'unknown';
		}
	}

	$effect(() => {
		update();
		if (!isBrowser) return noop;
		const off = [
			bindListener(window, 'offline', update, { passive: true }),
			bindListener(window, 'online', update, { passive: true }),
			bindListener(connection, 'change', update, { passive: true })
		];
		return () => {
			for (const detach of off) detach();
		};
	});

	return {
		isSupported,
		get isOnline() {
			return isOnline;
		},
		get offlineAt() {
			return offlineAt;
		},
		get onlineAt() {
			return onlineAt;
		},
		get downlink() {
			return downlink;
		},
		get downlinkMax() {
			return downlinkMax;
		},
		get effectiveType() {
			return effectiveType;
		},
		get rtt() {
			return rtt;
		},
		get saveData() {
			return saveData;
		},
		get type() {
			return type;
		}
	};
}
