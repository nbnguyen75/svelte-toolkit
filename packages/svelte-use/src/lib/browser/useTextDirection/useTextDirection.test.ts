// @vitest-environment jsdom
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mountUtil } from '../../../../test/fixtures/mount.ts';
import type { UseTextDirectionOptions } from './index.ts';
import { useTextDirection } from './index.ts';

const DIRY = document.createElement('div');
DIRY.id = 'dir-target';

beforeEach(() => {
	document.documentElement.removeAttribute('dir');
	document.body.appendChild(DIRY);
});

afterEach(() => {
	DIRY.remove();
});

const mountDir = (opts?: UseTextDirectionOptions) => mountUtil(() => useTextDirection(opts));

describe('useTextDirection', () => {
	it('defaults to ltr when the target carries no dir attribute', async () => {
		const { api, dispose } = await mountDir();
		try {
			expect(api.value).toBe('ltr');
		} finally {
			await dispose();
		}
	});

	it('reads the dir attribute of the html element', async () => {
		document.documentElement.setAttribute('dir', 'rtl');
		const { api, dispose } = await mountDir();
		try {
			expect(api.value).toBe('rtl');
		} finally {
			await dispose();
		}
	});

	it('reads auto as a real direction rather than falling back', async () => {
		document.documentElement.setAttribute('dir', 'auto');
		const { api, dispose } = await mountDir();
		try {
			expect(api.value).toBe('auto');
		} finally {
			await dispose();
		}
	});

	it('falls back to initialValue for an unrecognised dir value', async () => {
		document.documentElement.setAttribute('dir', 'sideways');
		const { api, dispose } = await mountDir({ initialValue: 'rtl' });
		try {
			expect(api.value).toBe('rtl');
		} finally {
			await dispose();
		}
	});

	it('falls back to initialValue when the selector matches nothing', async () => {
		const { api, dispose } = await mountDir({
			initialValue: 'auto',
			selector: '#does-not-exist'
		});
		try {
			expect(api.value).toBe('auto');
		} finally {
			await dispose();
		}
	});

	it('reads the dir attribute of a custom selector', async () => {
		DIRY.setAttribute('dir', 'rtl');
		const { api, dispose } = await mountDir({ selector: '#dir-target' });
		try {
			expect(api.value).toBe('rtl');
		} finally {
			await dispose();
		}
	});

	it('writes the attribute when value is assigned', async () => {
		const { api, dispose } = await mountDir();
		try {
			api.value = 'rtl';
			expect(document.documentElement.getAttribute('dir')).toBe('rtl');
			expect(api.value).toBe('rtl');

			api.value = 'auto';
			expect(document.documentElement.getAttribute('dir')).toBe('auto');
		} finally {
			await dispose();
		}
	});

	it('keeps the local value even when observe is off', async () => {
		const { api, dispose } = await mountDir();
		try {
			api.value = 'rtl';
			expect(api.value).toBe('rtl');
		} finally {
			await dispose();
		}
	});

	it('picks up an external attribute change when observe is on', async () => {
		const { api, dispose } = await mountDir({ observe: true });
		try {
			expect(api.value).toBe('ltr');

			document.documentElement.setAttribute('dir', 'rtl');
			await tick();
			expect(api.value).toBe('rtl');

			document.documentElement.setAttribute('dir', 'auto');
			await tick();
			expect(api.value).toBe('auto');
		} finally {
			await dispose();
		}
	});

	it('ignores an external attribute change when observe is off', async () => {
		const { api, dispose } = await mountDir({ observe: false });
		try {
			document.documentElement.setAttribute('dir', 'rtl');
			await tick();
			expect(api.value).toBe('ltr');
		} finally {
			await dispose();
		}
	});

	it('keeps reactivity after destructuring the return value', async () => {
		const { api, dispose } = await mountUtil(() => {
			const dir = useTextDirection({ observe: true });
			return {
				get current() {
					return dir.value;
				}
			};
		});
		try {
			expect(api.current).toBe('ltr');

			document.documentElement.setAttribute('dir', 'rtl');
			await tick();
			expect(api.current).toBe('rtl');
		} finally {
			await dispose();
		}
	});

	it('disconnects the MutationObserver on unmount', async () => {
		const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
		const { dispose } = await mountDir({ observe: true });
		await dispose();

		expect(disconnect).toHaveBeenCalled();
	});

	it('creates no observer at all when observe is off', async () => {
		const observe = vi.spyOn(MutationObserver.prototype, 'observe');
		const { dispose } = await mountDir({ observe: false });
		await dispose();

		expect(observe).not.toHaveBeenCalled();
	});

	it('leaves no observer behind when the selector matches nothing', async () => {
		const observe = vi.spyOn(MutationObserver.prototype, 'observe');
		const { dispose } = await mountDir({ observe: true, selector: '#does-not-exist' });
		await dispose();

		expect(observe).not.toHaveBeenCalled();
	});
});
