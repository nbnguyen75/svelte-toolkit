/**
 * DOM observer mocks for tests (jsdom ships none of these). Each mock
 * records instances and observed targets; drive callbacks via the static
 * `trigger` helpers. Installed per test file (jsdom gives every file a
 * fresh window, so no cross-file leakage). Test-only: never imported by
 * library code, never packaged.
 */

type ResizeHandler = (entries: Partial<ResizeObserverEntry>[], observer: ResizeObserver) => void;

/** Partial entry shape accepted by the resize trigger helper. */
export interface MockResizeEntry {
	target?: Element;
	contentRect?: Partial<DOMRectReadOnly>;
	borderBoxSize?: ResizeObserverSize[];
	contentBoxSize?: ResizeObserverSize[];
	devicePixelContentBoxSize?: ResizeObserverSize[];
}

type IntersectionHandler = (
	entries: Partial<IntersectionObserverEntry>[],
	observer: IntersectionObserver
) => void;

/** Controllable `ResizeObserver` stand-in. */
export class MockResizeObserver {
	static instances: MockResizeObserver[] = [];

	observed: Element[] = [];

	private handler: ResizeHandler;

	constructor(handler: ResizeHandler) {
		this.handler = handler;
		MockResizeObserver.instances.push(this);
	}

	observe(target: Element) {
		if (!this.observed.includes(target)) this.observed.push(target);
	}

	unobserve(target: Element) {
		this.observed = this.observed.filter((element) => element !== target);
	}

	disconnect() {
		this.observed = [];
		MockResizeObserver.instances = MockResizeObserver.instances.filter(
			(instance) => instance !== this
		);
	}

	static install() {
		MockResizeObserver.instances = [];
		window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
	}

	static observedCount(): number {
		return MockResizeObserver.instances.reduce(
			(total, instance) => total + instance.observed.length,
			0
		);
	}

	static triggerFor(target: Element, entry: MockResizeEntry) {
		for (const instance of MockResizeObserver.instances) {
			if (instance.observed.includes(target)) {
				instance.handler(
					[{ ...entry, target } as Partial<ResizeObserverEntry>],
					instance as unknown as ResizeObserver
				);
			}
		}
	}
}

/** Controllable `IntersectionObserver` stand-in. */
export class MockIntersectionObserver {
	static instances: MockIntersectionObserver[] = [];

	observed: Element[] = [];
	init: IntersectionObserverInit | undefined;

	private handler: IntersectionHandler;

	constructor(handler: IntersectionHandler, init?: IntersectionObserverInit) {
		this.handler = handler;
		this.init = init;
		MockIntersectionObserver.instances.push(this);
	}

	observe(target: Element) {
		if (!this.observed.includes(target)) this.observed.push(target);
	}

	unobserve(target: Element) {
		this.observed = this.observed.filter((element) => element !== target);
	}

	disconnect() {
		this.observed = [];
		MockIntersectionObserver.instances = MockIntersectionObserver.instances.filter(
			(instance) => instance !== this
		);
	}

	static install() {
		MockIntersectionObserver.instances = [];
		window.IntersectionObserver =
			MockIntersectionObserver as unknown as typeof IntersectionObserver;
	}

	static triggerIntersecting(target: Element, isIntersecting: boolean) {
		for (const instance of MockIntersectionObserver.instances) {
			if (instance.observed.includes(target)) {
				instance.handler(
					[{ isIntersecting, target, time: Date.now() }],
					instance as unknown as IntersectionObserver
				);
			}
		}
	}
}
