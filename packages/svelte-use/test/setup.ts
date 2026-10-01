/**
 * Shared vitest setup (runs once per test file, in every environment).
 *
 * - Installs a controllable `window.matchMedia` stub when a DOM is present
 *   (jsdom ships none). Tests drive it via `setMediaMatches()`.
 * - Resets timer mocks and the media-query registry after each test.
 */
import { afterEach, vi } from 'vitest';

type MediaChangeListener = (event: MediaQueryListEvent) => void;

interface MediaStub {
	list: MediaQueryList;
	listeners: Set<MediaChangeListener>;
}

const mediaStates = new Map<string, boolean>();
const mediaStubs = new Map<string, MediaStub>();

function createMediaQueryList(query: string): MediaQueryList {
	const listeners = new Set<MediaChangeListener>();
	const list = {
		addEventListener(type: string, callback: EventListenerOrEventListenerObject | null) {
			if (type === 'change' && typeof callback === 'function') {
				listeners.add(callback as MediaChangeListener);
			}
		},
		addListener(callback: ((event: MediaQueryListEvent) => void) | null) {
			if (typeof callback === 'function') listeners.add(callback);
		},
		dispatchEvent() {
			return false;
		},
		get matches() {
			return mediaStates.get(query) ?? false;
		},
		media: query,
		onchange: null,
		removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null) {
			if (type === 'change' && typeof callback === 'function') {
				listeners.delete(callback as MediaChangeListener);
			}
		},
		removeListener(callback: ((event: MediaQueryListEvent) => void) | null) {
			if (typeof callback === 'function') listeners.delete(callback);
		}
	};
	mediaStubs.set(query, { list, listeners });
	return list;
}

/**
 * Drive the `matchMedia` stub: set `matches` for `query` and notify
 * registered `change` listeners, mirroring a real OS/browser change.
 */
export function setMediaMatches(query: string, matches: boolean): void {
	mediaStates.set(query, matches);
	const stub = mediaStubs.get(query);
	if (!stub) return;
	// Shape a faithful `MediaQueryListEvent`: `type` and `target` are both
	// read by Svelte's `handle_event_propagation`
	// (`current_target = path[0] || event.target`), so omitting them throws for
	// any util built on Svelte's `MediaQuery` primitive.
	const event = {
		matches,
		media: query,
		type: 'change',
		target: stub.list,
		composedPath: () => [stub.list]
	} as unknown as MediaQueryListEvent;
	// Real EventTargets invoke listeners with `this` bound to the target, which
	// Svelte's `on()` also relies on (`handle_event_propagation.call(dom, ...)`).
	for (const listener of [...stub.listeners]) listener.call(stub.list, event);
}

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
	window.matchMedia = (query: string): MediaQueryList => createMediaQueryList(query);
}

afterEach(() => {
	mediaStates.clear();
	mediaStubs.clear();
	vi.useRealTimers();
	vi.restoreAllMocks();
});
