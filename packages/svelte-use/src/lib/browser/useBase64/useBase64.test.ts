// @vitest-environment jsdom
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountInitialized } from '../../../../test/fixtures/mount.ts';
import { useBase64 } from './index.ts';

const noop = () => {};

const DATA_URL = /^data:.*?;base64,/;

const strip = (value: string): string => value.replace(DATA_URL, '');

/** Mount `useBase64`, run to the first settle, hand back the api. */
async function mounted(target: unknown, options?: Parameters<typeof useBase64>[1]) {
	const mountedUtil = await mountInitialized(() => useBase64(target, options), noop);
	await mountedUtil.api.promise;
	return mountedUtil;
}

describe('useBase64', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	// The expected payloads below are VueUse's own inline snapshots, so the
	// default serialization is pinned to the upstream contract rather than to
	// whatever this implementation happens to produce.
	it('encodes a plain object as JSON', async () => {
		const { api, dispose } = await mountInitialized(() => useBase64({ test: 5 }), noop);
		try {
			await api.promise;
			expect(strip(api.base64)).toBe('eyJ0ZXN0Ijo1fQ==');
		} finally {
			await dispose();
		}
	});

	it('encodes a Map as a JSON object', async () => {
		const { api, dispose } = await mounted(new Map([['test', 1]]));
		try {
			expect(strip(api.base64)).toBe('eyJ0ZXN0IjoxfQ==');
		} finally {
			await dispose();
		}
	});

	it('encodes a Set as a JSON array', async () => {
		const { api, dispose } = await mounted(new Set([1]));
		try {
			expect(strip(api.base64)).toBe('WzFd');
		} finally {
			await dispose();
		}
	});

	it('encodes an array as JSON', async () => {
		const { api, dispose } = await mounted([1, 2, 3]);
		try {
			expect(strip(api.base64)).toBe('WzEsMiwzXQ==');
		} finally {
			await dispose();
		}
	});

	it('uses a custom serializer for object input', async () => {
		const { api, dispose } = await mounted([1, 2, 3], {
			serializer: (value) => JSON.stringify(value, null, 2)
		});
		try {
			// Pretty-printed, so the payload differs from the compact default.
			expect(strip(api.base64)).not.toBe('WzEsMiwzXQ==');
			expect(atob(strip(api.base64))).toBe(JSON.stringify([1, 2, 3], null, 2));
		} finally {
			await dispose();
		}
	});

	it('ignores a serializer for non-object input', async () => {
		const { api, dispose } = await mounted('hello', { serializer: () => 'nope' });
		try {
			expect(strip(api.base64)).toBe(btoa('hello'));
		} finally {
			await dispose();
		}
	});

	it('keeps the data URL prefix by default', async () => {
		const { api, dispose } = await mounted([1, 2, 3]);
		try {
			expect(api.base64).toMatch(DATA_URL);
		} finally {
			await dispose();
		}
	});

	it('strips the data URL prefix when dataUrl is false', async () => {
		const { api, dispose } = await mounted([1, 2, 3], { dataUrl: false });
		try {
			expect(api.base64).toBe('WzEsMiwzXQ==');
		} finally {
			await dispose();
		}
	});

	it('encodes a string as text/plain', async () => {
		const { api, dispose } = await mounted('hello');
		try {
			expect(api.base64).toMatch(/^data:text\/plain;base64,/);
			expect(strip(api.base64)).toBe(btoa('hello'));
		} finally {
			await dispose();
		}
	});

	it('encodes a Blob', async () => {
		const { api, dispose } = await mounted(new Blob(['hello'], { type: 'text/plain' }));
		try {
			expect(strip(api.base64)).toBe(btoa('hello'));
		} finally {
			await dispose();
		}
	});

	it('encodes an ArrayBuffer as raw base64', async () => {
		const { api, dispose } = await mounted(new Uint8Array([104, 105]).buffer);
		try {
			expect(api.base64).toBe(btoa('hi'));
		} finally {
			await dispose();
		}
	});

	it('encodes a large ArrayBuffer without overflowing the argument limit', async () => {
		// `String.fromCharCode(...bytes)` passes one argument per byte and
		// throws RangeError past roughly 64k.
		const size = 200_000;
		const { api, dispose } = await mounted(new Uint8Array(size).fill(65).buffer);
		try {
			expect(atob(api.base64)).toHaveLength(size);
		} finally {
			await dispose();
		}
	});

	it('encodes a canvas and forwards type and quality', async () => {
		const canvas = document.createElement('canvas');
		const toDataURL = vi.spyOn(canvas, 'toDataURL').mockReturnValue('data:image/jpeg;base64,Zm9v');
		const { api, dispose } = await mounted(canvas, { type: 'image/jpeg', quality: 0.8 });
		try {
			expect(api.base64).toBe('data:image/jpeg;base64,Zm9v');
			expect(toDataURL).toHaveBeenCalledWith('image/jpeg', 0.8);
		} finally {
			await dispose();
		}
	});

	it('encodes an image through a canvas without mutating the source element', async () => {
		const drawImage = vi.fn();
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
			drawImage
		} as unknown as CanvasRenderingContext2D);
		vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
			'data:image/png;base64,aW1n'
		);
		// jsdom does not fetch images, so the clone would never fire `load`.
		vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);

		const image = document.createElement('img');
		image.src = 'https://example.test/pic.png';

		const { api, dispose } = await mounted(image, { type: 'image/png' });
		try {
			expect(api.base64).toBe('data:image/png;base64,aW1n');
			// The encoded element must be the clone, carrying the source `src`:
			// a cloneNode without it would silently encode a blank canvas.
			const drawn = drawImage.mock.calls[0]?.[0] as HTMLImageElement;
			expect(drawn).not.toBe(image);
			expect(drawn.src).toBe(image.src);
			expect(drawn.crossOrigin).toBe('Anonymous');
			// The caller's element must not be touched, because writing to it
			// changes how the page loads that image from then on.
			expect(image.crossOrigin).toBeNull();
		} finally {
			await dispose();
		}
	});

	it('resolves empty for a nullish target', async () => {
		const { api, dispose } = await mounted(undefined);
		try {
			expect(api.base64).toBe('');
		} finally {
			await dispose();
		}
	});

	it('resolves empty for a null target', async () => {
		const { api, dispose } = await mounted(null);
		try {
			expect(api.base64).toBe('');
		} finally {
			await dispose();
		}
	});

	it('re-encodes when a getter target changes', async () => {
		const source = createBox<number[] | undefined>([1]);
		const { api, dispose } = await mountInitialized(() => useBase64(() => source.value), noop);
		try {
			await api.promise;
			expect(strip(api.base64)).toBe('WzFd');

			source.value = [1, 2, 3];
			await tick();
			await api.promise;

			expect(strip(api.base64)).toBe('WzEsMiwzXQ==');
		} finally {
			await dispose();
		}
	});

	it('stays reactive when read through a getter', async () => {
		const source = createBox<number[] | undefined>([1]);
		const seen: string[] = [];
		const { dispose } = await mountInitialized(
			() => useBase64(() => source.value),
			(api) => {
				// Read inside the harness effect: this is the shape that would
				// break if `base64` were a snapshot instead of a getter.
				seen.push(api.base64);
			}
		);
		try {
			source.value = [1, 2, 3];
			await tick();
			await vi.waitFor(() => {
				expect(strip(seen.at(-1) ?? '')).toBe('WzEsMiwzXQ==');
			});
		} finally {
			await dispose();
		}
	});

	it('exposes the in-flight promise of the latest run', async () => {
		const { api, dispose } = await mounted('a');
		try {
			expect(api.promise).toBeInstanceOf(Promise);
		} finally {
			await dispose();
		}
	});

	it('re-encodes on a manual execute without a target change', async () => {
		const { api, dispose } = await mounted('hello');
		try {
			const before = api.promise;
			await api.execute();
			expect(strip(api.base64)).toBe(btoa('hello'));
			expect(api.promise).not.toBe(before);
		} finally {
			await dispose();
		}
	});

	it('keeps the newest result when runs settle out of order', async () => {
		const source = createBox<string | undefined>('a');
		const { api, dispose } = await mountInitialized(() => useBase64(() => source.value), noop);
		try {
			// Two runs in flight at once: the first must not overwrite the
			// second's payload when it settles last.
			const first = api.execute();
			source.value = 'bb';
			await tick();
			const second = api.execute();

			await first;
			await second;
			await tick();

			expect(strip(api.base64)).toBe(btoa('bb'));
		} finally {
			await dispose();
		}
	});
});
