// @vitest-environment jsdom
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mountInitialized } from '../../../../test/fixtures/mount.ts';
import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { useObjectUrl } from './index.ts';

// jsdom implements no object-URL registry, so both calls are observed directly.
// Added as own properties on the real `URL` (rather than replacing the global)
// so nothing else in the environment loses the constructor.
let created: Blob[] = [];
let revoked: string[] = [];

function define(name: string, value: unknown): void {
	Object.defineProperty(URL, name, { value, configurable: true, writable: true });
}

beforeEach(() => {
	created = [];
	revoked = [];
	define(
		'createObjectURL',
		vi.fn((blob: Blob) => {
			created.push(blob);
			return `blob:mock/${created.length}`;
		})
	);
	define(
		'revokeObjectURL',
		vi.fn((url: string) => {
			revoked.push(url);
		})
	);
});

afterEach(() => {
	Reflect.deleteProperty(URL, 'createObjectURL');
	Reflect.deleteProperty(URL, 'revokeObjectURL');
});

const blobOf = (name: string) => new Blob([name], { type: 'text/plain' });

const noop = () => {};

describe('useObjectUrl', () => {
	it('creates a URL for the source object', async () => {
		const blob = blobOf('a');
		const { api, dispose } = await mountInitialized(() => useObjectUrl(blob), noop);
		try {
			expect(created).toEqual([blob]);
			expect(api.value).toBe('blob:mock/1');
		} finally {
			await dispose();
		}
	});

	it('reports undefined for a nullish source', async () => {
		const { api, dispose } = await mountInitialized(() => useObjectUrl(undefined), noop);
		try {
			expect(api.value).toBeUndefined();
			expect(created).toEqual([]);
		} finally {
			await dispose();
		}
	});

	it('follows a getter source', async () => {
		const source = createBox<Blob | undefined>(blobOf('a'));
		const { api, dispose } = await mountInitialized(() => useObjectUrl(() => source.value), noop);
		try {
			expect(api.value).toBe('blob:mock/1');

			source.value = blobOf('b');
			await tick();

			expect(api.value).toBe('blob:mock/2');
			expect(created).toHaveLength(2);
		} finally {
			await dispose();
		}
	});

	it('revokes the URL that is no longer in effect when the source changes', async () => {
		const source = createBox<Blob | undefined>(blobOf('a'));
		const { api, dispose } = await mountInitialized(() => useObjectUrl(() => source.value), noop);
		try {
			expect(api.value).toBe('blob:mock/1');

			source.value = blobOf('b');
			await tick();

			// The trap this pins: revoking whatever `url` currently holds, rather
			// than the URL the previous run created, revokes the live one instead.
			expect(api.value).toBe('blob:mock/2');
			expect(revoked).toEqual(['blob:mock/1']);
		} finally {
			await dispose();
		}
	});

	it('revokes and clears the value when the source becomes nullish', async () => {
		const source = createBox<Blob | undefined>(blobOf('a'));
		const { api, dispose } = await mountInitialized(() => useObjectUrl(() => source.value), noop);
		try {
			source.value = undefined;
			await tick();
			expect(api.value).toBeUndefined();
			expect(revoked).toEqual(['blob:mock/1']);
		} finally {
			await dispose();
		}
	});

	it('revokes on unmount', async () => {
		const { dispose } = await mountInitialized(() => useObjectUrl(blobOf('a')), noop);
		await dispose();
		expect(revoked).toEqual(['blob:mock/1']);
	});

	it('revokes each URL exactly once across a swap and an unmount', async () => {
		const source = createBox<Blob | undefined>(blobOf('a'));
		const { dispose } = await mountInitialized(() => useObjectUrl(() => source.value), noop);
		source.value = blobOf('b');
		await tick();
		await dispose();

		expect(revoked).toEqual(['blob:mock/1', 'blob:mock/2']);
	});

	it('stays reactive when read through a getter', async () => {
		const source = createBox<Blob | undefined>(blobOf('a'));
		const seen: (string | undefined)[] = [];
		const { dispose } = await mountInitialized(
			() => useObjectUrl(() => source.value),
			(api) => {
				// Read inside the harness effect: this is the shape that would break
				// if `value` were a snapshot instead of a getter.
				seen.push(api.value);
			}
		);
		try {
			source.value = blobOf('b');
			await tick();
			expect(seen.at(-1)).toBe('blob:mock/2');
		} finally {
			await dispose();
		}
	});
});
