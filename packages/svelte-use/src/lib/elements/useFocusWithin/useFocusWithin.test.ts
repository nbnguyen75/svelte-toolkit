// @vitest-environment jsdom
import { tick } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';

import { createBox } from '../../../../test/fixtures/box.svelte.ts';
import { mountInitialized } from '../../../../test/fixtures/mount.ts';
import { useFocusWithin } from './index.ts';

const noop = () => {};

/** A div with two focusable children, mirroring the common "form is focused" case. */
function tree(): { host: HTMLDivElement; first: HTMLButtonElement; last: HTMLButtonElement } {
	const host = document.createElement('div');
	const first = document.createElement('button');
	const last = document.createElement('button');
	host.append(first, last);
	document.body.append(host);
	return { host, first, last };
}

afterEach(() => {
	document.body.replaceChildren();
});

describe('useFocusWithin', () => {
	it('reports false before anything focuses', async () => {
		const { host } = tree();
		const { api, dispose } = await mountInitialized(() => useFocusWithin(host), noop);
		try {
			expect(api.focused).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('reports true when the element itself is focused', async () => {
		const { host } = tree();
		const { api, dispose } = await mountInitialized(() => useFocusWithin(host), noop);
		try {
			host.tabIndex = 0;
			host.focus();

			expect(api.focused).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('reports true when a descendant is focused', async () => {
		const { host, last } = tree();
		const { api, dispose } = await mountInitialized(() => useFocusWithin(host), noop);
		try {
			last.focus();

			expect(api.focused).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('stays true when focus moves between descendants', async () => {
		const { host, first, last } = tree();
		const { api, dispose } = await mountInitialized(() => useFocusWithin(host), noop);
		try {
			first.focus();
			last.focus();

			expect(document.activeElement).toBe(last);
			expect(api.focused).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('reports false when focus moves outside', async () => {
		const outside = document.createElement('button');
		document.body.append(outside);

		const { host, first } = tree();
		const { api, dispose } = await mountInitialized(() => useFocusWithin(host), noop);
		try {
			first.focus();
			outside.focus();

			expect(api.focused).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('reports false when focus is lost to the document', async () => {
		const { host, first } = tree();
		const { api, dispose } = await mountInitialized(() => useFocusWithin(host), noop);
		try {
			first.focus();
			// No receiving element, e.g. the tab bar being clicked.
			first.blur();

			expect(api.focused).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('tracks a target that resolves later', async () => {
		const { host, last } = tree();
		const source = createBox<HTMLDivElement | undefined>(undefined);
		const { api, dispose } = await mountInitialized(() => useFocusWithin(() => source.value), noop);
		try {
			source.value = host;
			await tick();

			last.focus();
			expect(api.focused).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('ignores a nullish target instead of throwing', async () => {
		const { first } = tree();
		const { api, dispose } = await mountInitialized(() => useFocusWithin(null), noop);
		try {
			first.focus();

			expect(api.focused).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('stops listening on unmount', async () => {
		const { host, last } = tree();
		const { dispose } = await mountInitialized(() => useFocusWithin(host), noop);
		await dispose();

		last.focus();
		expect(document.activeElement).toBe(last);
	});
});
