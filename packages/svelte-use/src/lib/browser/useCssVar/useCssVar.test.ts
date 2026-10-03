// @vitest-environment jsdom
import { tick } from 'svelte';
import { beforeEach, describe, expect, it } from 'vitest';

import { mountInitialized } from '../../../../test/fixtures/mount.ts';
import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { useCssVar } from './index.ts';

// The default target is the shared `<html>` element, so every case starts from a
// clean slate rather than inheriting the previous case's custom properties.
beforeEach(() => {
	document.documentElement.removeAttribute('style');
});

describe('useCssVar', () => {
	it('writes the value to the default target', async () => {
		const { api, dispose } = await mountInitialized(
			() => useCssVar('--su-color', undefined, { initialValue: 'red' }),
			() => undefined
		);
		try {
			expect(document.documentElement.style.getPropertyValue('--su-color')).toBe('red');
			expect(api.value).toBe('red');
		} finally {
			await dispose();
		}
	});

	it('propagates an assignment to the element', async () => {
		const { api, dispose } = await mountInitialized(
			() => useCssVar('--su-write', undefined, { initialValue: 'red' }),
			() => undefined
		);
		try {
			api.value = 'blue';
			await tick();
			expect(document.documentElement.style.getPropertyValue('--su-write')).toBe('blue');
			expect(api.value).toBe('blue');
		} finally {
			await dispose();
		}
	});

	it('removes the property when the value is cleared', async () => {
		const { api, dispose } = await mountInitialized(
			() => useCssVar('--su-clear', undefined, { initialValue: 'red' }),
			() => undefined
		);
		try {
			api.value = undefined;
			await tick();
			expect(document.documentElement.style.getPropertyValue('--su-clear')).toBe('');
		} finally {
			await dispose();
		}
	});

	it('writes to an explicit target', async () => {
		const el = document.createElement('div');
		document.body.appendChild(el);
		const { api, dispose } = await mountInitialized(
			() => useCssVar('--su-target', () => el, { initialValue: 'green' }),
			() => undefined
		);
		try {
			expect(el.style.getPropertyValue('--su-target')).toBe('green');
			expect(document.documentElement.style.getPropertyValue('--su-target')).toBe('');
			api.value = 'teal';
			await tick();
			expect(el.style.getPropertyValue('--su-target')).toBe('teal');
		} finally {
			await dispose();
			el.remove();
		}
	});

	it('adopts a value already set on the element', async () => {
		const el = document.createElement('div');
		el.style.setProperty('--su-preexisting', 'purple');
		document.body.appendChild(el);
		// No initialValue: the read effect must pick the inline value up rather
		// than leaving the cell empty.
		const { api, dispose } = await mountInitialized(
			() => useCssVar('--su-preexisting', () => el),
			() => undefined
		);
		try {
			expect(api.value).toBe('purple');
		} finally {
			await dispose();
			el.remove();
		}
	});

	it('does not strand the property when the target changes', async () => {
		const first = document.createElement('div');
		const second = document.createElement('div');
		document.body.append(first, second);
		const target = createBox<HTMLElement>(first);
		const { dispose } = await mountInitialized(
			() => useCssVar('--su-swap', () => target.value, { initialValue: 'orange' }),
			() => undefined
		);
		try {
			expect(first.style.getPropertyValue('--su-swap')).toBe('orange');
			target.value = second;
			await tick();
			expect(first.style.getPropertyValue('--su-swap')).toBe('');
			expect(second.style.getPropertyValue('--su-swap')).toBe('orange');
		} finally {
			await dispose();
			first.remove();
			second.remove();
		}
	});

	it('does not strand the property when the name changes', async () => {
		const name = createBox('--su-name-a');
		const { api, dispose } = await mountInitialized(
			() => useCssVar(() => name.value, undefined, { initialValue: 'pink' }),
			() => undefined
		);
		try {
			expect(document.documentElement.style.getPropertyValue('--su-name-a')).toBe('pink');
			name.value = '--su-name-b';
			await tick();
			expect(document.documentElement.style.getPropertyValue('--su-name-a')).toBe('');
			expect(document.documentElement.style.getPropertyValue('--su-name-b')).toBe('pink');
			expect(api.value).toBe('pink');
		} finally {
			await dispose();
		}
	});

	it('stays live when read from an effect', async () => {
		const seen: (string | undefined)[] = [];
		const { api, dispose } = await mountInitialized(
			() => useCssVar('--su-live', undefined, { initialValue: 'red' }),
			(css) => {
				seen.push(css.value);
			}
		);
		try {
			// The reader effect re-runs on assignment, which is what a template
			// binding does; reading once in the test body would prove nothing.
			expect(seen).toContain('red');
			api.value = 'blue';
			await tick();
			expect(seen.at(-1)).toBe('blue');
		} finally {
			await dispose();
		}
	});
});
