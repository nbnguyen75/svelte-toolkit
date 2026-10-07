// @vitest-environment jsdom
/**
 * `useBroadcastChannel` owns reactive state, so it is created at init and read
 * from a separate effect — the real usage shape. jsdom has no
 * `BroadcastChannel`, so a fake stands in for the platform.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mountInitialized } from '../../../../test/fixtures/mount.ts';
import type { UseBroadcastChannelReturn } from './index.ts';
import { useBroadcastChannel } from './index.ts';

type Listener = (event: Event) => void;

/** A controllable BroadcastChannel stand-in. */
class FakeBroadcastChannel {
	static instances: FakeBroadcastChannel[] = [];
	readonly name: string;
	readonly posted: unknown[] = [];
	closed = false;
	private readonly listeners = new Map<string, Listener[]>();

	constructor(name: string) {
		this.name = name;
		FakeBroadcastChannel.instances.push(this);
	}

	postMessage(data: unknown): void {
		this.posted.push(data);
	}

	addEventListener(type: string, handler: Listener): void {
		const list = this.listeners.get(type) ?? [];
		list.push(handler);
		this.listeners.set(type, list);
	}

	removeEventListener(type: string, handler: Listener): void {
		this.listeners.set(
			type,
			(this.listeners.get(type) ?? []).filter((h) => h !== handler)
		);
	}

	close(): void {
		this.closed = true;
	}

	/** Deliver a message event to this channel's `message` listeners. */
	emit(type: string, event: Event): void {
		for (const handler of this.listeners.get(type) ?? []) handler(event);
	}
}

function install(): void {
	FakeBroadcastChannel.instances = [];
	vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('useBroadcastChannel', () => {
	it('opens a channel with the given name', async () => {
		install();
		const { api, dispose } = await mountInitialized(
			() => useBroadcastChannel<string, string>({ name: 'theme' }),
			() => {}
		);
		const bus: UseBroadcastChannelReturn<string, string> = api;

		expect(bus.isSupported).toBe(true);
		expect(FakeBroadcastChannel.instances).toHaveLength(1);
		expect(FakeBroadcastChannel.instances[0].name).toBe('theme');
		expect(bus.isClosed).toBe(false);
		await dispose();
	});

	it('routes incoming messages into data', async () => {
		install();
		const { api, dispose } = await mountInitialized(
			() => useBroadcastChannel<string, string>({ name: 'theme' }),
			() => {}
		);

		FakeBroadcastChannel.instances[0].emit(
			'message',
			new MessageEvent('message', { data: 'dark' })
		);

		expect(api.data).toBe('dark');
		await dispose();
	});

	it('posts through to the channel', async () => {
		install();
		const { api, dispose } = await mountInitialized(
			() => useBroadcastChannel<string, string>({ name: 'theme' }),
			() => {}
		);

		api.post('light');

		expect(FakeBroadcastChannel.instances[0].posted).toEqual(['light']);
		await dispose();
	});

	it('close() closes and marks closed', async () => {
		install();
		const { api, dispose } = await mountInitialized(
			() => useBroadcastChannel<string, string>({ name: 'theme' }),
			() => {}
		);

		api.close();

		expect(FakeBroadcastChannel.instances[0].closed).toBe(true);
		expect(api.isClosed).toBe(true);
		// Idempotent: closing twice closes once per call without throwing.
		api.close();
		expect(api.isClosed).toBe(true);
		await dispose();
	});

	it('closes on unmount', async () => {
		install();
		const { api, dispose } = await mountInitialized(
			() => useBroadcastChannel<string, string>({ name: 'theme' }),
			() => {}
		);

		await dispose();

		expect(FakeBroadcastChannel.instances[0].closed).toBe(true);
		expect(api.isClosed).toBe(true);
	});

	it('records messageerror events', async () => {
		install();
		const { api, dispose } = await mountInitialized(
			() => useBroadcastChannel<string, string>({ name: 'theme' }),
			() => {}
		);

		const failure = new Event('messageerror');
		FakeBroadcastChannel.instances[0].emit('messageerror', failure);

		expect(api.error).toBe(failure);
		await dispose();
	});

	it('is unsupported without the platform class', async () => {
		vi.stubGlobal('BroadcastChannel', undefined);
		const { api, dispose } = await mountInitialized(
			() => useBroadcastChannel<string, string>({ name: 'theme' }),
			() => {}
		);

		expect(api.isSupported).toBe(false);
		expect(api.channel).toBe(undefined);
		// Both are safe no-ops, not throws.
		api.post('x');
		api.close();
		expect(api.isClosed).toBe(true);
		await dispose();
	});
});
