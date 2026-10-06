// @vitest-environment jsdom
/**
 * `useNetwork` owns reactive state, so it is created at init and read from a
 * separate effect — the real usage shape.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mountInitialized } from '../../../../test/fixtures/mount.ts';
import type { UseNetworkReturn } from './index.ts';
import { useNetwork } from './index.ts';

/** A stub NetworkInformation with controllable values and real listener plumbing. */
function stubConnection(info: Record<string, number | string | boolean | undefined>) {
	const listeners = new Map<string, (() => void)[]>();
	const connection = {
		...info,
		addEventListener: vi.fn((type: string, handler: () => void) => {
			const list = listeners.get(type) ?? [];
			list.push(handler);
			listeners.set(type, list);
		}),
		removeEventListener: vi.fn((type: string, handler: () => void) => {
			listeners.set(
				type,
				(listeners.get(type) ?? []).filter((h) => h !== handler)
			);
		}),
		fire: (type: string) => {
			for (const handler of listeners.get(type) ?? []) handler();
		}
	};
	Object.defineProperty(window.navigator, 'connection', {
		configurable: true,
		value: connection
	});
	return connection;
}

afterEach(() => {
	Reflect.deleteProperty(window.navigator, 'connection');
});

describe('useNetwork', () => {
	it('reports online with no connection API', async () => {
		const { api, dispose } = await mountInitialized(
			() => useNetwork(),
			() => {}
		);
		const net: UseNetworkReturn = api;

		expect(net.isSupported).toBe(false);
		expect(net.isOnline).toBe(true);
		expect(net.type).toBe('unknown');
		expect(net.offlineAt).toBe(undefined);
		expect(net.onlineAt).not.toBe(undefined);
		await dispose();
	});

	it('reads the connection info when present', async () => {
		stubConnection({
			downlink: 10,
			downlinkMax: 20,
			effectiveType: '4g',
			rtt: 50,
			saveData: true,
			type: 'wifi'
		});
		const { api, dispose } = await mountInitialized(
			() => useNetwork(),
			() => {}
		);

		expect(api.isSupported).toBe(true);
		expect(api.downlink).toBe(10);
		expect(api.downlinkMax).toBe(20);
		expect(api.effectiveType).toBe('4g');
		expect(api.rtt).toBe(50);
		expect(api.saveData).toBe(true);
		expect(api.type).toBe('wifi');
		await dispose();
	});

	it('follows offline and online events', async () => {
		const { api, dispose } = await mountInitialized(
			() => useNetwork(),
			() => {}
		);

		// jsdom never goes offline on its own: the property and the event are
		// both stubbed, the way the platform pairs them.
		Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
		window.dispatchEvent(new Event('offline'));
		expect(api.isOnline).toBe(false);
		expect(api.offlineAt).not.toBe(undefined);
		expect(api.onlineAt).toBe(undefined);

		Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
		window.dispatchEvent(new Event('online'));
		expect(api.isOnline).toBe(true);
		expect(api.offlineAt).toBe(undefined);
		expect(api.onlineAt).not.toBe(undefined);
		await dispose();
	});

	it('re-reads on connection change', async () => {
		const connection = stubConnection({ downlink: 10, type: 'wifi' });
		const { api, dispose } = await mountInitialized(
			() => useNetwork(),
			() => {}
		);

		expect(api.downlink).toBe(10);
		(connection.downlink as number) = 1.5;
		connection.fire('change');
		expect(api.downlink).toBe(1.5);
		await dispose();
	});

	it('rejects a connection stub without listener plumbing', async () => {
		// Present but unusable: the name exists, neither capability does.
		Object.defineProperty(window.navigator, 'connection', {
			configurable: true,
			value: { downlink: 10 }
		});
		const { api, dispose } = await mountInitialized(
			() => useNetwork(),
			() => {}
		);

		expect(api.isSupported).toBe(false);
		expect(api.downlink).toBe(undefined);
		await dispose();
	});
});
