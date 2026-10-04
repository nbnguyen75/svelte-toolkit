// @vitest-environment jsdom
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mountInitialized } from '../../../../test/fixtures/mount.ts';
import { useFileDialog } from './index.ts';

const noop = () => {};

/** jsdom has no file picker, so `click()` is what we observe. */
function stubClick(el: HTMLInputElement): ReturnType<typeof vi.spyOn> {
	return vi.spyOn(el, 'click').mockImplementation(noop);
}

/** Fire the event a real picker would, with a selection attached. */
function selectFiles(el: HTMLInputElement, files: File[]): void {
	Object.defineProperty(el, 'files', { configurable: true, value: makeFileList(files) });
	el.dispatchEvent(new Event('change'));
}

function makeFileList(files: File[]): FileList {
	// jsdom exposes FileList but no way to build one, and `instanceof` against
	// a realm-bound constructor is banned anyway, so shape it structurally.
	const list: Record<string | number | symbol, unknown> = {
		length: files.length,
		item: (index: number) => files[index] ?? null
	};
	files.forEach((file, index) => {
		list[index] = file;
	});
	list[Symbol.iterator] = () => files[Symbol.iterator]();
	return list as unknown as FileList;
}

describe('useFileDialog', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('creates a file input once mounted', async () => {
		const { api, dispose } = await mountInitialized(() => useFileDialog(), noop);
		try {
			expect(api.input?.type).toBe('file');
		} finally {
			await dispose();
		}
	});

	it('opens the dialog on demand', async () => {
		const { api, dispose } = await mountInitialized(() => useFileDialog(), noop);
		try {
			const click = stubClick(api.input!);
			api.open();
			expect(click).toHaveBeenCalledOnce();
		} finally {
			await dispose();
		}
	});

	it('publishes the picked files', async () => {
		const onChange = vi.fn();
		const { api, dispose } = await mountInitialized(() => useFileDialog({ onChange }), noop);
		try {
			const file = new File(['a'], 'a.txt', { type: 'text/plain' });
			selectFiles(api.input!, [file]);

			expect(api.files).not.toBeNull();
			expect(api.files?.[0]?.name).toBe('a.txt');
			expect(onChange).toHaveBeenCalledWith(api.files);
		} finally {
			await dispose();
		}
	});

	it('reports a dismissal through onCancel and leaves files alone', async () => {
		const onCancel = vi.fn();
		const { api, dispose } = await mountInitialized(() => useFileDialog({ onCancel }), noop);
		try {
			api.input!.dispatchEvent(new Event('cancel'));

			expect(onCancel).toHaveBeenCalledOnce();
			// A cancelled dialog keeps whatever was already selected.
			expect(api.files).toBeNull();
		} finally {
			await dispose();
		}
	});

	it('clears the selection on reset and re-picks the same file', async () => {
		const onChange = vi.fn();
		const { api, dispose } = await mountInitialized(() => useFileDialog({ onChange }), noop);
		try {
			const file = new File(['a'], 'a.txt');
			selectFiles(api.input!, [file]);
			expect(api.files).not.toBeNull();

			api.reset();

			expect(api.files).toBeNull();
			// The native half of the fix: clearing only the state would leave the
			// input holding the old file, and re-picking it fires no change.
			expect(api.input?.value).toBe('');
			expect(onChange).toHaveBeenLastCalledWith(null);

			selectFiles(api.input!, [file]);
			expect(api.files?.[0]?.name).toBe('a.txt');
		} finally {
			await dispose();
		}
	});

	it('applies hook options to the input', async () => {
		const { api, dispose } = await mountInitialized(
			() => useFileDialog({ multiple: false, accept: 'image/*', capture: 'user' }),
			noop
		);
		try {
			expect(api.input?.multiple).toBe(false);
			expect(api.input?.accept).toBe('image/*');
			expect(api.input?.capture).toBe('user');
		} finally {
			await dispose();
		}
	});

	it('defaults to multiple with any accept and no capture attribute', async () => {
		const { api, dispose } = await mountInitialized(() => useFileDialog(), noop);
		try {
			expect(api.input?.multiple).toBe(true);
			expect(api.input?.accept).toBe('*');
			expect(api.input?.hasAttribute('capture')).toBe(false);
		} finally {
			await dispose();
		}
	});

	it('sets the directory flag', async () => {
		const { api, dispose } = await mountInitialized(() => useFileDialog({ directory: true }), noop);
		try {
			expect(api.input?.webkitdirectory).toBe(true);
		} finally {
			await dispose();
		}
	});

	it('lets a per-call option override the hook option', async () => {
		const { api, dispose } = await mountInitialized(
			() => useFileDialog({ accept: 'image/*' }),
			noop
		);
		try {
			stubClick(api.input!);
			api.open({ accept: '.pdf' });

			expect(api.input?.accept).toBe('.pdf');
		} finally {
			await dispose();
		}
	});

	it('resets before opening when asked', async () => {
		const onChange = vi.fn();
		const { api, dispose } = await mountInitialized(() => useFileDialog({ onChange }), noop);
		try {
			selectFiles(api.input!, [new File(['a'], 'a.txt')]);
			stubClick(api.input!);

			api.open({ reset: true });

			expect(api.files).toBeNull();
			expect(api.input?.value).toBe('');
		} finally {
			await dispose();
		}
	});

	it('keeps the selection when opening without reset', async () => {
		const { api, dispose } = await mountInitialized(() => useFileDialog(), noop);
		try {
			selectFiles(api.input!, [new File(['a'], 'a.txt')]);
			stubClick(api.input!);

			api.open();

			expect(api.files?.length).toBe(1);
		} finally {
			await dispose();
		}
	});

	it('adopts a caller-supplied input and leaves it in the document', async () => {
		const el = document.createElement('input');
		document.body.append(el);

		const { api, dispose } = await mountInitialized(() => useFileDialog({ input: el }), noop);
		try {
			expect(api.input).toBe(el);
			expect(el.isConnected).toBe(true);

			const click = stubClick(el);
			api.open();
			expect(click).toHaveBeenCalledOnce();
		} finally {
			await dispose();
			el.remove();
		}
	});

	it('does not touch a caller-supplied input after unmount', async () => {
		const el = document.createElement('input');
		const onChange = vi.fn();

		const { dispose } = await mountInitialized(() => useFileDialog({ input: el, onChange }), noop);
		await dispose();

		el.dispatchEvent(new Event('change'));

		// The listener lived in an effect, so teardown removed it: a change on
		// their element after unmount cannot write to destroyed state.
		expect(onChange).not.toHaveBeenCalled();
	});

	it('ignores a change after unmount', async () => {
		const onChange = vi.fn();
		const { api, dispose } = await mountInitialized(() => useFileDialog({ onChange }), noop);
		const el = api.input!;
		await dispose();

		el.dispatchEvent(new Event('change'));

		expect(onChange).not.toHaveBeenCalled();
	});

	it('stays reactive when read through a getter', async () => {
		const source = createSelection();
		const seen: (number | null)[] = [];
		const { api, dispose } = await mountInitialized(
			() => useFileDialog(),
			(dialog) => {
				seen.push(dialog.files?.length ?? null);
			}
		);
		try {
			selectFiles(api.input!, source);
			await tick();

			expect(seen.at(-1)).toBe(2);
		} finally {
			await dispose();
		}
	});
});

function createSelection(): File[] {
	return [new File(['a'], 'a.txt'), new File(['b'], 'b.txt')];
}
