import { useEventListener } from '../../browser/useEventListener/index.svelte.ts';
import { isBrowser } from '../../shared/is.ts';

/** String serializer for storage values. */
export type UseStorageSerializer<T> = {
	/** Encode a value for storage. */
	write: (value: T) => string;
	/** Decode a stored string; may throw, and callers fall back to the default. */
	read: (raw: string) => T;
};

/** Reactive storage cell returned by `useLocalStorage` / `useSessionStorage`. */
export interface UseStorageReturn<T> {
	/** Current value; assigning persists write-through. Getter/setter-backed (destructure-safe). */
	value: T;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Structural check: does `value` have the same runtime shape as `sample`?
 *
 * A JSON round-trip cannot be *proven* to produce `T` — TypeScript has no way
 * to verify that arbitrary stored data matches an arbitrary type parameter.
 * Rather than assert it, the default serializer checks the decoded value
 * against the shape of the default value and rejects it when they differ.
 * This is the contract that makes the decode sound: `T` must be
 * JSON-representable (primitives, arrays, and plain objects).
 */
function matchesShape(value: unknown, sample: unknown): boolean {
	if (Array.isArray(sample)) {
		if (!Array.isArray(value)) return false;
		const first: unknown = sample[0];
		return first === undefined || value.every((entry) => matchesShape(entry, first));
	}
	if (Array.isArray(value)) return false;
	if (isPlainRecord(sample)) {
		if (!isPlainRecord(value)) return false;
		return Object.entries(sample).every(
			([key, expected]) => key in value && matchesShape(value[key], expected)
		);
	}
	if (sample === null) return value === null;
	return typeof value === typeof sample;
}

/** Type-guard form of {@link matchesShape}; narrows without a type assertion. */
function isShapeOf<T>(value: unknown, sample: T): value is T {
	return matchesShape(value, sample);
}

function parseJson(raw: string): { value: unknown; ok: true } | { ok: false } {
	try {
		const parsed: unknown = JSON.parse(raw);
		return { ok: true, value: parsed };
	} catch {
		return { ok: false };
	}
}

/**
 * Default codec: JSON, with plain strings stored unquoted.
 * `read` rejects any payload that does not match `sample`'s shape.
 */
function createDefaultSerializer<T>(sample: T): UseStorageSerializer<T> {
	return {
		read: (raw: string) => {
			const parsed = parseJson(raw);
			const candidate = parsed.ok ? parsed.value : raw;
			return isShapeOf(candidate, sample) ? candidate : sample;
		},
		write: (value: T) => (typeof value === 'string' ? value : JSON.stringify(value))
	};
}

/**
 * Reactive storage-backed cell over a caller-provided storage.
 * `getStorage` is only invoked in the browser, so globals like
 * `localStorage` are safe to reference inside it during SSR.
 *
 * @param key Storage key.
 * @param defaultValue Value used when the key is absent, unreadable, or during SSR.
 * @param getStorage Storage accessor (e.g. `() => localStorage`).
 * @param serializer Custom codec (default: JSON with string passthrough).
 * @returns Getter/setter-backed cell; assigning persists write-through.
 * @example
 * ```ts
 * const token = useStorage('token', '', () => sessionStorage);
 * token.value; // session-backed, '' on the server
 * ```
 */
export function useStorage<T>(
	key: string,
	defaultValue: T,
	getStorage: () => Storage,
	serializer: UseStorageSerializer<T> = createDefaultSerializer(defaultValue)
): UseStorageReturn<T> {
	const read = (): T => {
		if (!isBrowser) return defaultValue;
		let raw: string | null;
		try {
			raw = getStorage().getItem(key);
		} catch {
			return defaultValue;
		}
		if (raw === null) return defaultValue;
		try {
			return serializer.read(raw);
		} catch {
			return defaultValue;
		}
	};

	let value = $state<T>(read());

	$effect(() => {
		if (!isBrowser) return;
		try {
			getStorage().setItem(key, serializer.write(value));
		} catch {
			// Storage unavailable or full: keep the in-memory value.
		}
	});

	if (isBrowser) {
		useEventListener(
			() => window,
			'storage',
			(e: StorageEvent) => {
				if (e.key !== key || e.newValue === null) return;
				try {
					value = serializer.read(e.newValue);
				} catch {
					// A corrupt cross-tab value: keep the current one.
				}
			}
		);
	}

	return {
		get value() {
			return value;
		},
		set value(v: T) {
			value = v;
		}
	};
}

/**
 * Reactive `localStorage`-backed cell. SSR returns `defaultValue` untouched.
 *
 * @param key Storage key.
 * @param defaultValue Value used when the key is absent, unreadable, or during SSR.
 * @param serializer Custom codec (default: JSON with string passthrough).
 * @returns Getter/setter-backed cell; assigning persists write-through.
 * @example
 * ```ts
 * const theme = useLocalStorage('theme', 'light');
 * theme.value = 'dark'; // persists write-through
 * ```
 */
export function useLocalStorage<T>(
	key: string,
	defaultValue: T,
	serializer?: UseStorageSerializer<T>
): UseStorageReturn<T> {
	return useStorage(key, defaultValue, () => localStorage, serializer);
}

/**
 * Reactive `sessionStorage`-backed cell. SSR returns `defaultValue` untouched.
 *
 * @param key Storage key.
 * @param defaultValue Value used when the key is absent, unreadable, or during SSR.
 * @param serializer Custom codec (default: JSON with string passthrough).
 * @returns Getter/setter-backed cell; assigning persists write-through.
 * @example
 * ```ts
 * const draft = useSessionStorage('draft', '');
 * draft.value = 'hello'; // tab-scoped
 * ```
 */
export function useSessionStorage<T>(
	key: string,
	defaultValue: T,
	serializer?: UseStorageSerializer<T>
): UseStorageReturn<T> {
	return useStorage(key, defaultValue, () => sessionStorage, serializer);
}
