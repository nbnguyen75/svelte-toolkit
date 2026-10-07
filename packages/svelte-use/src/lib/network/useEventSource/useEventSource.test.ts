// @vitest-environment jsdom
/**
 * `useEventSource` owns reactive state, so it is created at init and read
 * from a separate effect — the real usage shape. jsdom has no `EventSource`,
 * so a fake stands in for the platform. No network anywhere.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tick } from 'svelte';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountInitialized } from '../../../../test/fixtures/mount.ts';
import type { UseEventSourceReturn } from './index.ts';
import { useEventSource } from './index.ts';

type Listener = (event: Event) => void;

/** A controllable EventSource stand-in. */
class FakeEventSource {
	static instances: FakeEventSource[] = [];
	readonly url: string | URL;
	readonly init: EventSourceInit;
	readyState = 0;
	closed = false;
	private readonly listeners = new Map<string, Listener[]>();

	constructor(url: string | URL, init: EventSourceInit) {
		this.url = url;
		this.init = init;
		FakeEventSource.instances.push(this);
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
		this.readyState = 2;
	}

	/** The server accepted the connection. */
	serverOpen(): void {
		this.readyState = 1;
		this.fire('open', new Event('open'));
	}

	/** The server refused the connection outright. */
	serverRefuse(): void {
		this.readyState = 2;
		this.fire('error', new Event('error'));
	}

	/** Deliver a server-sent event. */
	serverMessage(data: string, event = 'message', lastEventId = ''): void {
		this.fire(event, new MessageEvent(event, { data, lastEventId }));
	}

	private fire(type: string, event: Event): void {
		for (const handler of this.listeners.get(type) ?? []) handler(event);
	}
}

function install(): void {
	FakeEventSource.instances = [];
	vi.stubGlobal('EventSource', FakeEventSource);
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

describe('useEventSource', () => {
	it('opens immediately with the URL and credentials', async () => {
		install();
		const { api, dispose } = await mountInitialized(
			() => useEventSource<string>(() => '/feed', [], { withCredentials: true }),
			() => {}
		);
		const feed: UseEventSourceReturn<string[], string> = api;

		expect(feed.status).toBe('CONNECTING');
		expect(FakeEventSource.instances).toHaveLength(1);
		expect(String(FakeEventSource.instances[0].url)).toBe('/feed');
		expect(FakeEventSource.instances[0].init.withCredentials).toBe(true);

		FakeEventSource.instances[0].serverOpen();
		expect(feed.status).toBe('OPEN');
		expect(feed.error).toBe(null);
		await dispose();
	});

	it('opens nothing with immediate false', async () => {
		install();
		const { api, dispose } = await mountInitialized(
			() => useEventSource<string>(() => '/feed', [], { immediate: false }),
			() => {}
		);

		expect(FakeEventSource.instances).toHaveLength(0);
		// Verbatim upstream quirk: the status starts CONNECTING even though
		// nothing was opened. Pinned, not fixed — see the README.
		expect(api.status).toBe('CONNECTING');
		await dispose();
	});

	it('opens nothing for an undefined URL', async () => {
		install();
		const { dispose } = await mountInitialized(
			() => useEventSource<string>(() => undefined, []),
			() => {}
		);

		expect(FakeEventSource.instances).toHaveLength(0);
		await dispose();
	});

	it('routes messages into data, event, and lastEventId', async () => {
		install();
		const { api, dispose } = await mountInitialized(
			() => useEventSource<string>(() => '/feed', []),
			() => {}
		);

		FakeEventSource.instances[0].serverMessage('42', 'message', 'id-7');

		expect(api.data).toBe('42');
		expect(api.event).toBe('message');
		expect(api.lastEventId).toBe('id-7');
		await dispose();
	});

	it('listens to named events and ignores the rest', async () => {
		install();
		const { api, dispose } = await mountInitialized(
			() => useEventSource<['price'], string>(() => '/feed', ['price']),
			() => {}
		);

		FakeEventSource.instances[0].serverMessage('10', 'price');
		expect(api.data).toBe('10');
		expect(api.event).toBe('price');

		FakeEventSource.instances[0].serverMessage('noise', 'other');
		expect(api.data).toBe('10');
		await dispose();
	});

	it('applies the serializer', async () => {
		install();
		const { api, dispose } = await mountInitialized(
			() =>
				useEventSource<string[], number>(() => '/feed', [], {
					serializer: { read: (value) => Number(value) }
				}),
			() => {}
		);

		FakeEventSource.instances[0].serverMessage('42');

		expect(api.data).toBe(42);
		await dispose();
	});

	it('closes the status and records the error', async () => {
		install();
		const { api, dispose } = await mountInitialized(
			() => useEventSource<string>(() => '/feed', []),
			() => {}
		);

		FakeEventSource.instances[0].serverRefuse();

		expect(api.status).toBe('CLOSED');
		expect(api.error).not.toBe(null);
		// No reconnect configured: nothing further happens.
		expect(FakeEventSource.instances).toHaveLength(1);
		await dispose();
	});

	it('reconnects after the delay with autoReconnect', async () => {
		vi.useFakeTimers();
		install();
		const { api, dispose } = await mountInitialized(
			() => useEventSource<string>(() => '/feed', [], { autoReconnect: true }),
			() => {}
		);

		FakeEventSource.instances[0].serverRefuse();
		expect(FakeEventSource.instances).toHaveLength(1);

		await vi.advanceTimersByTimeAsync(1000);
		expect(FakeEventSource.instances).toHaveLength(2);
		expect(api.status).toBe('CONNECTING');
		await dispose();
	});

	it('stops after the attempt budget and calls onFailed', async () => {
		vi.useFakeTimers();
		install();
		const failed: string[] = [];
		const { dispose } = await mountInitialized(
			() =>
				useEventSource<string>(() => '/feed', [], {
					// `retries` counts attempts, not retries: 2 means the first
					// failure reconnects once and the second calls `onFailed`.
					autoReconnect: { retries: 2, delay: 500, onFailed: () => failed.push('x') }
				}),
			() => {}
		);

		FakeEventSource.instances[0].serverRefuse();
		await vi.advanceTimersByTimeAsync(500);
		expect(FakeEventSource.instances).toHaveLength(2);

		FakeEventSource.instances[1].serverRefuse();
		await vi.advanceTimersByTimeAsync(5000);
		expect(FakeEventSource.instances).toHaveLength(2);
		expect(failed).toEqual(['x']);
		await dispose();
	});

	it('never reconnects an explicitly closed stream', async () => {
		vi.useFakeTimers();
		install();
		const { api, dispose } = await mountInitialized(
			() => useEventSource<string>(() => '/feed', [], { autoReconnect: true }),
			() => {}
		);

		api.close();
		expect(api.status).toBe('CLOSED');
		await vi.advanceTimersByTimeAsync(5000);

		expect(FakeEventSource.instances).toHaveLength(1);
		await dispose();
	});

	it('reopens when the URL changes', async () => {
		install();
		const url = createBox<string | undefined>('/one');
		const { api, dispose } = await mountInitialized(
			() => useEventSource<string>(() => url.value, []),
			() => {}
		);

		expect(FakeEventSource.instances).toHaveLength(1);
		url.value = '/two';
		// Effect re-runs are async: the reopen lands after a tick.
		await tick();

		expect(FakeEventSource.instances).toHaveLength(2);
		expect(String(FakeEventSource.instances[1].url)).toBe('/two');
		expect(FakeEventSource.instances[0].closed).toBe(true);
		expect(api.status).toBe('CONNECTING');
		await dispose();
	});

	it('keeps the connection with autoConnect false', async () => {
		install();
		const url = createBox<string | undefined>('/one');
		const { dispose } = await mountInitialized(
			() => useEventSource<string>(() => url.value, [], { autoConnect: false }),
			() => {}
		);

		url.value = '/two';

		expect(FakeEventSource.instances).toHaveLength(1);
		await dispose();
	});

	it('open() closes the current stream first', async () => {
		install();
		const { api, dispose } = await mountInitialized(
			() => useEventSource<string>(() => '/feed', []),
			() => {}
		);

		api.open();

		expect(FakeEventSource.instances).toHaveLength(2);
		expect(FakeEventSource.instances[0].closed).toBe(true);
		await dispose();
	});

	it('unmount drops the timer and the connection', async () => {
		vi.useFakeTimers();
		install();
		const { dispose } = await mountInitialized(
			() => useEventSource<string>(() => '/feed', [], { autoReconnect: true }),
			() => {}
		);

		FakeEventSource.instances[0].serverRefuse();
		await dispose();
		await vi.advanceTimersByTimeAsync(5000);

		expect(FakeEventSource.instances).toHaveLength(1);
		expect(FakeEventSource.instances[0].closed).toBe(true);
	});
});
