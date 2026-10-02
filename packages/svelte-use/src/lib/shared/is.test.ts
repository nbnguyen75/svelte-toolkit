// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

import {
	assert,
	clamp,
	hasOwn,
	isBrowser,
	isClient,
	isDef,
	isIOS,
	isObject,
	isWorker,
	notNullish,
	now,
	noop,
	rand,
	timestamp
} from './is.ts';

describe('environment constants', () => {
	it('reports a browser under jsdom', () => {
		expect(isBrowser).toBe(true);
		expect(isClient).toBe(true);
	});

	it('isWorker is false on the main thread', () => {
		expect(isWorker).toBe(false);
	});

	it('isClient is an alias of isBrowser, not a looser check', () => {
		// VueUse's isClient uses `window && document`; a `||` variant would let a
		// bare `window` (a worker-ish global) pass, which would break SSR guards.
		expect(isClient).toBe(isBrowser);
	});
});

describe('isDef', () => {
	it('rejects only undefined', () => {
		expect(isDef(0)).toBe(true);
		expect(isDef('')).toBe(true);
		expect(isDef(false)).toBe(true);
		expect(isDef(null)).toBe(true);
		expect(isDef(undefined)).toBe(false);
	});

	it('narrows an optional value', () => {
		const value: string | undefined = 'ok' as string | undefined;
		if (isDef(value)) expect(value.toUpperCase()).toBe('OK');
		else throw new Error('expected isDef to narrow');
	});
});

describe('notNullish', () => {
	it('rejects null and undefined, accepts falsy values', () => {
		expect(notNullish(0)).toBe(true);
		expect(notNullish('')).toBe(true);
		expect(notNullish(false)).toBe(true);
		expect(notNullish(null)).toBe(false);
		expect(notNullish(undefined)).toBe(false);
	});

	it('narrows null out of the type', () => {
		const value: string | null = 'ok' as string | null;
		if (notNullish(value)) expect(value.length).toBe(2);
		else throw new Error('expected notNullish to narrow');
	});
});

describe('isObject', () => {
	it('accepts plain objects and rejects everything else', () => {
		expect(isObject({})).toBe(true);
		expect(isObject({ a: 1 })).toBe(true);
		expect(isObject(Object.create(null))).toBe(true);
	});

	it('rejects arrays, dates, collections, functions, and nullish', () => {
		expect(isObject([])).toBe(false);
		expect(isObject([1, 2])).toBe(false);
		expect(isObject(new Date())).toBe(false);
		expect(isObject(new Map())).toBe(false);
		expect(isObject(new Set())).toBe(false);
		expect(isObject(() => {})).toBe(false);
		expect(isObject(null)).toBe(false);
		expect(isObject(undefined)).toBe(false);
		expect(isObject('str')).toBe(false);
		expect(isObject(42)).toBe(false);
	});

	it('accepts a class instance, unlike a plain typeof object check', () => {
		class Thing {}
		// Documented boundary: a class instance carries no brand of its own, so
		// `[object Object]` matches. `isObject` rejects built-ins, not instances.
		expect(isObject(new Thing())).toBe(true);
		expect(isObject(new Date())).toBe(false);
		expect(isObject(new Map())).toBe(false);
	});
});

describe('hasOwn', () => {
	it('detects own keys and ignores inherited ones', () => {
		expect(hasOwn({ a: 1 }, 'a')).toBe(true);
		expect(hasOwn({ a: 1 }, 'b')).toBe(false);
		expect(hasOwn({}, 'toString')).toBe(false);
		expect(hasOwn({}, 'hasOwnProperty')).toBe(false);
	});

	it('ignores a key present only on the prototype', () => {
		const proto = { inherited: 1 };
		const child = Object.create(proto) as { inherited?: number };
		expect(hasOwn(child, 'inherited')).toBe(false);
	});

	it('detects a key whose value is undefined', () => {
		expect(hasOwn({ a: undefined }, 'a')).toBe(true);
	});
});

describe('noop', () => {
	it('returns undefined and throws', () => {
		expect(noop()).toBeUndefined();
		expect(() => noop()).not.toThrow();
	});
});

describe('now / timestamp', () => {
	it('returns epoch milliseconds', () => {
		expect(now()).toBeGreaterThan(1_600_000_000_000);
		expect(timestamp()).toBeGreaterThan(1_600_000_000_000);
	});

	it('advances with the wall clock', () => {
		vi.useFakeTimers();
		try {
			const start = now();
			vi.advanceTimersByTime(5000);
			expect(now() - start).toBe(5000);
			expect(timestamp() - start).toBe(5000);
		} finally {
			vi.useRealTimers();
		}
	});
});

describe('rand', () => {
	it('stays inside an inclusive integer range', () => {
		for (let i = 0; i < 500; i += 1) {
			const value = rand(3, 7);
			expect(Number.isInteger(value)).toBe(true);
			expect(value).toBeGreaterThanOrEqual(3);
			expect(value).toBeLessThanOrEqual(7);
		}
	});

	it('can return both endpoints', () => {
		const seen = new Set<number>();
		for (let i = 0; i < 500; i += 1) seen.add(rand(0, 1));
		expect(seen.has(0)).toBe(true);
		expect(seen.has(1)).toBe(true);
	});

	it('handles a single-value range', () => {
		expect(rand(5, 5)).toBe(5);
	});

	it('floors and ceils fractional bounds', () => {
		for (let i = 0; i < 200; i += 1) {
			const value = rand(1.2, 3.8);
			expect(value).toBeGreaterThanOrEqual(2);
			expect(value).toBeLessThanOrEqual(3);
		}
	});
});

describe('clamp', () => {
	it('passes through values inside the range', () => {
		expect(clamp(5, 1, 10)).toBe(5);
	});

	it('clamps to both bounds', () => {
		expect(clamp(-5, 1, 10)).toBe(1);
		expect(clamp(50, 1, 10)).toBe(10);
	});

	it('handles negative ranges', () => {
		expect(clamp(-20, -10, -5)).toBe(-10);
		expect(clamp(0, -10, -5)).toBe(-5);
	});

	it('preserves fractional values', () => {
		expect(clamp(0.5, 0, 1)).toBe(0.5);
	});
});

describe('assert', () => {
	it('stays silent when the condition holds', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		try {
			assert(true, 'must not warn');
			expect(warn).not.toHaveBeenCalled();
		} finally {
			warn.mockRestore();
		}
	});

	it('warns with every forwarded info when the condition fails', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		try {
			assert(false, 'expected non-empty', 0);
			expect(warn).toHaveBeenCalledWith('expected non-empty', 0);
		} finally {
			warn.mockRestore();
		}
	});

	it('warns rather than throwing, so it never breaks control flow', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		try {
			expect(() => assert(false, 'nope')).not.toThrow();
		} finally {
			warn.mockRestore();
		}
	});
});

describe('isIOS', () => {
	// jsdom's `Navigator` omits `maxTouchPoints` entirely, so `vi.spyOn` on it
	// throws "property is not defined". `userAgent` exists but lives on the
	// prototype and is read-only, so both are shadowed with own properties.
	const originals = {
		userAgent: Object.getOwnPropertyDescriptor(window.navigator, 'userAgent'),
		maxTouchPoints: Object.getOwnPropertyDescriptor(window.navigator, 'maxTouchPoints')
	};

	const setUA = (ua: string, maxTouchPoints = 0) => {
		Object.defineProperty(window.navigator, 'userAgent', {
			configurable: true,
			get: () => ua
		});
		Object.defineProperty(window.navigator, 'maxTouchPoints', {
			configurable: true,
			get: () => maxTouchPoints
		});
	};

	const restoreUA = () => {
		for (const [key, descriptor] of Object.entries(originals)) {
			if (descriptor) Object.defineProperty(window.navigator, key, descriptor);
			else Reflect.deleteProperty(window.navigator, key);
		}
	};

	it('detects iPhone, iPad, and iPod user agents', () => {
		try {
			setUA('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)');
			expect(isIOS()).toBe(true);
			setUA('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)');
			expect(isIOS()).toBe(true);
			setUA('Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X)');
			expect(isIOS()).toBe(true);
		} finally {
			restoreUA();
		}
	});

	it('detects an iPadOS proxy reporting as Macintosh with touch points', () => {
		try {
			setUA('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5);
			expect(isIOS()).toBe(true);
		} finally {
			restoreUA();
		}
	});

	it('rejects a desktop Macintosh without touch points', () => {
		try {
			setUA('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0);
			expect(isIOS()).toBe(false);
		} finally {
			restoreUA();
		}
	});

	it('rejects Android, Windows, and Linux', () => {
		try {
			setUA('Mozilla/5.0 (Linux; Android 14)');
			expect(isIOS()).toBe(false);
			setUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
			expect(isIOS()).toBe(false);
			setUA('Mozilla/5.0 (X11; Linux x86_64)');
			expect(isIOS()).toBe(false);
		} finally {
			restoreUA();
		}
	});

	it('rejects an empty user agent', () => {
		try {
			setUA('');
			expect(isIOS()).toBe(false);
		} finally {
			restoreUA();
		}
	});

	it('relies on userAgent staying a string, not the UA-CH object', () => {
		// `navigator.userAgentData` is a branded object, not a string. If a future
		// runtime dropped the string form, the regex tests above would silently
		// coerce to "undefined" and report false for every device.
		expect(typeof globalThis.navigator.userAgent).toBe('string');
	});
});
