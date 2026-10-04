import { isBrowser } from '../../shared/is.ts';

/** Options for {@link useFileDialog}. */
export interface UseFileDialogOptions {
	/** Called with the new selection, or `null` when the selection is cleared. */
	onChange?: (files: FileList | null) => void;
	/**
	 * Use this input instead of creating one. Lets a caller keep the element in
	 * their own markup and style it, or inspect it.
	 */
	input?: HTMLInputElement;
	/** Called when the user dismisses the dialog without choosing anything. */
	onCancel?: () => void;
	/**
	 * Let the user select directories instead of files.
	 * @see [HTMLInputElement webkitdirectory](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement#webkitdirectory)
	 * @default false
	 */
	directory?: boolean;
	/**
	 * Allow selecting more than one file.
	 * @default true
	 */
	multiple?: boolean;
	/**
	 * Which camera to use for a capture prompt, e.g. `'user'` or `'environment'`.
	 * @see [HTMLInputElement capture](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#capture)
	 */
	capture?: string;
	/** Comma-separated list of accepted types or extensions, e.g. `image/*,.pdf`. */
	accept?: string;
	/**
	 * Clear the selection before opening, so picking the same file twice still
	 * fires a change event.
	 * @default false
	 */
	reset?: boolean;
}

/** Reactive file dialog state returned by {@link useFileDialog}. */
export interface UseFileDialogReturn {
	/** Open the dialog. Per-call options override the ones passed to the hook. */
	open: (options?: Partial<UseFileDialogOptions>) => void;
	/** The input driving the dialog; `undefined` during SSR. */
	readonly input: HTMLInputElement | undefined;
	/**
	 * Current selection, `null` before the first pick and after `reset()`.
	 * Getter-backed (destructure-safe).
	 */
	readonly files: FileList | null;
	/** Clear the selection, so the same file can be picked again. */
	reset: () => void;
}

const DEFAULTS = {
	accept: '*',
	multiple: true
} satisfies UseFileDialogOptions;

/**
 * Writes options onto `el`. Takes the element as an argument rather than
 * reading the reactive one, so the creating effect never depends on the state
 * it sets.
 */
function applyTo(el: HTMLInputElement, next: Partial<UseFileDialogOptions>) {
	el.type = 'file';
	el.multiple = next.multiple ?? DEFAULTS.multiple;
	el.accept = next.accept ?? DEFAULTS.accept;
	el.webkitdirectory = next.directory ?? false;
	// Only assign when asked: `capture` is absent by default, and writing an
	// empty string is not the same as leaving the attribute off.
	if (next.capture !== undefined) el.capture = next.capture;
}

/**
 * Open a file dialog from a handler, without an `<input type="file">` in the
 * template. Returns the picked `FileList` reactively.
 *
 * Must be called in component initialization (uses `$state` / `$effect`).
 *
 * VueUse also accepts `initialFiles` and a reactive `input`. Both are dropped:
 * `initialFiles` needs `DataTransfer` to seed an input this util owns, and a
 * reactive `input` has no meaning without a reactive element reference. Pass
 * `input` to adopt your own element instead - then plain `bind:files` and
 * `onchange` work and this hook is unnecessary.
 *
 * @param options See {@link UseFileDialogOptions}.
 * @returns Getter-backed `files` / `input`, plus `open` and `reset`.
 * @example
 * ```ts
 * const { files, open } = useFileDialog({ accept: 'image/*' });
 * // <button onclick={() => open()}>Pick an image</button>
 * files; // FileList | null
 * ```
 */
export function useFileDialog(options: UseFileDialogOptions = {}): UseFileDialogReturn {
	let files = $state<FileList | null>(null);
	let input = $state<HTMLInputElement | undefined>(undefined);

	function reset() {
		files = null;
		// The native reset: without clearing `value`, re-picking the same file
		// fires no change event at all.
		if (input) input.value = '';
		options.onChange?.(null);
	}

	function open(local?: Partial<UseFileDialogOptions>) {
		const el = input;
		if (!el) return;
		applyTo(el, { ...DEFAULTS, ...options, ...local });
		if (local?.reset ?? options.reset) reset();
		el.click();
	}

	/**
	 * Installs the listeners and returns the teardown. An effect teardown is the
	 * only thing that detaches them: `addEventListener` has no automatic scope,
	 * and a detached element still dispatches to its handlers, so leaving these
	 * on would write to unmounted state.
	 */
	function wire(el: HTMLInputElement): () => void {
		const onChangeEvent = () => {
			files = el.files;
			options.onChange?.(files);
		};
		const onCancelEvent = () => {
			options.onCancel?.();
		};
		el.addEventListener('change', onChangeEvent);
		el.addEventListener('cancel', onCancelEvent);
		applyTo(el, options);

		return () => {
			el.removeEventListener('change', onChangeEvent);
			el.removeEventListener('cancel', onCancelEvent);
			// Detach only what this effect created; a caller-supplied input stays
			// in their markup.
			if (el !== options.input) el.remove();
			if (input === el) input = undefined;
		};
	}

	// Created and wired once. VueUse re-assigns `onchange` from a `computed` on
	// every read, re-installing the handler each time the element reference
	// changes.
	$effect(() => {
		const el = options.input ?? (isBrowser ? document.createElement('input') : undefined);
		input = el;
		return el ? wire(el) : undefined;
	});

	return {
		get files() {
			return files;
		},
		get input() {
			return input;
		},
		open,
		reset
	};
}
