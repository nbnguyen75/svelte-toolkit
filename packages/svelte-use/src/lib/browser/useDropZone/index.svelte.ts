import type { MaybeGetter } from '../../shared/getter.ts';

import { isDragEvent } from '../../shared/is.ts';
import { useEventListener } from '../useEventListener/index.ts';

/**
 * Which MIME types the zone accepts: a list of substrings to allow, or a
 * predicate over the types of the dropped items.
 *
 * Deliberately **not** a getter, unlike every other option in this package. A
 * function here already means "validate these types", so there is no way to tell
 * a getter for the list from the predicate. {@link UseDropZoneOptions.checkValidity}
 * is the reactive escape hatch: it is read per event and overrides `dataTypes`.
 */
export type UseDropZoneDataTypes = readonly string[] | ((types: readonly string[]) => boolean);

/** Options for {@link useDropZone}. */
export interface UseDropZoneOptions {
	/** Called when a drag enters the zone. */
	onEnter?: (files: File[] | null, event: DragEvent) => void;
	/** Called when a drag leaves the zone. */
	onLeave?: (files: File[] | null, event: DragEvent) => void;
	/** Called with the dropped files, or `null` when the drag carried none. */
	onDrop?: (files: File[] | null, event: DragEvent) => void;
	/** Called repeatedly while a drag moves over the zone. */
	onOver?: (files: File[] | null, event: DragEvent) => void;
	/**
	 * Full control over validity, for rules `dataTypes` cannot express. Receives
	 * the raw `DataTransferItemList` and takes precedence over `dataTypes` and
	 * `multiple`. Read on every drag event, so it may close over reactive state.
	 */
	checkValidity?: (items: DataTransferItemList) => boolean;
	/**
	 * Call `preventDefault()` even for a drag the zone rejects, so the browser
	 * stops treating the drop as unhandled. Defaults to `false`.
	 */
	preventDefaultForUnhandled?: boolean;
	/** Allowed data types. Unset means every type is allowed. */
	dataTypes?: UseDropZoneDataTypes;
	/** Allow more than one file per drop. Defaults to `true`. */
	multiple?: boolean;
}

/** Reactive drop-zone state returned by {@link useDropZone}. */
export interface UseDropZoneReturn {
	/** Whether a drag is currently over the target. */
	readonly isOverDropZone: boolean;
	/** The files from the last accepted drop, or `null` if there has not been one. */
	readonly files: File[] | null;
}

/**
 * Safari does not expose `files` during a drag - only `items` - so on Safari
 * every validity check fails and the zone would reject all drops. Detected by
 * user agent, the only signal available; the `chrome in window` half keeps
 * Chrome's "Safari" mention in its default UA string from matching.
 */
function isSafari(): boolean {
	return /^(?:(?!chrome|android).)*safari/i.test(navigator.userAgent) && !('chrome' in window);
}

/**
 * Reactive file drop zone: which files were dropped on the target, and whether a
 * drag is over it right now.
 *
 * Must be called in component initialization (uses `$state`).
 *
 * @param target Element or `Document` to watch, or a getter re-resolved on
 * every effect run.
 * @param options `dataTypes`, `checkValidity`, `onDrop`, `onEnter`, `onLeave`,
 * `onOver`, `multiple`, `preventDefaultForUnhandled`. A bare function is taken
 * as `onDrop`.
 * @returns Getter-backed `files` and `isOverDropZone`.
 * @example
 * ```ts
 * const zone = useDropZone(() => el, { dataTypes: ['image'], onDrop: upload });
 * ```
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useDropZone } from '@wynn-dev/svelte-use';
 *
 *   let el: HTMLDivElement;
 *   const zone = useDropZone(() => el, (files) => upload(files ?? []));
 * </script>
 *
 * <div bind:this={el} class:over={zone.isOverDropZone}>
 *   {zone.files?.length ?? 0} file(s)
 * </div>
 * ```
 */
export function useDropZone(
	target: MaybeGetter<HTMLElement | Document | null | undefined>,
	options: UseDropZoneOptions['onDrop']
): UseDropZoneReturn;
/**
 * Reactive file drop zone: which files were dropped on the target, and whether a
 * drag is over it right now.
 *
 * Must be called in component initialization (uses `$state`).
 *
 * @param target Element or `Document` to watch, or a getter re-resolved on
 * every effect run.
 * @param options `dataTypes`, `checkValidity`, `onDrop`, `onEnter`, `onLeave`,
 * `onOver`, `multiple`, `preventDefaultForUnhandled`.
 * @returns Getter-backed `files` and `isOverDropZone`.
 * @example
 * ```ts
 * const zone = useDropZone(() => el, { dataTypes: ['image'], onDrop: upload });
 * ```
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useDropZone } from '@wynn-dev/svelte-use';
 *
 *   let el: HTMLDivElement;
 *   const zone = useDropZone(() => el, (files) => upload(files ?? []));
 * </script>
 *
 * <div bind:this={el} class:over={zone.isOverDropZone}>
 *   {zone.files?.length ?? 0} file(s)
 * </div>
 * ```
 */
export function useDropZone(
	target: MaybeGetter<HTMLElement | Document | null | undefined>,
	options?: UseDropZoneOptions
): UseDropZoneReturn;
export function useDropZone(
	target: MaybeGetter<HTMLElement | Document | null | undefined>,
	options: UseDropZoneOptions | UseDropZoneOptions['onDrop'] = {}
): UseDropZoneReturn {
	const config: UseDropZoneOptions = typeof options === 'function' ? { onDrop: options } : options;

	// `raw`, because the contents are `File` objects: upstream uses a shallowRef
	// for the same reason, and a deep proxy over a `File` buys nothing.
	let files = $state.raw<File[] | null>(null);
	let isOverDropZone = $state(false);

	// Plain counters, never rendered. `counter` counts nested dragenter/dragleave
	// pairs: a drag crossing a child fires both on the way in and on the way out,
	// so the zone is only left once the pairs balance.
	let counter = 0;
	let isValid = true;

	// Read once, as upstream does: neither is a reactive source, and a drop zone
	// whose rules change mid-drag would be a way to lose a file silently.
	const multiple = config.multiple ?? true;
	const preventDefaultForUnhandled = config.preventDefaultForUnhandled ?? false;

	/** The dropped files, or `null` when the drag carried none. */
	function getFiles(event: DragEvent): File[] | null {
		const list = Array.from(event.dataTransfer?.files ?? []);
		const [first] = list;
		// Asking about `first` rather than `list.length` is what keeps this free of
		// a non-null assertion under `noUncheckedIndexedAccess`.
		return first ? (multiple ? list : [first]) : null;
	}

	function checkDataTypes(types: readonly string[]): boolean {
		const dataTypes = config.dataTypes;
		if (typeof dataTypes === 'function') return dataTypes(types);
		if (!dataTypes?.length) return true;
		if (types.length === 0) return false;
		// Substring, not equality: `['image']` admits `image/png`.
		return types.every((type) => dataTypes.some((allowed) => type.includes(allowed)));
	}

	function checkValidity(items: DataTransferItemList): boolean {
		if (config.checkValidity) return config.checkValidity(items);
		const types = Array.from(items).map((item) => item.type);
		return checkDataTypes(types) && (multiple || items.length <= 1);
	}

	function handleDragEvent(event: Event, eventType: 'enter' | 'over' | 'leave' | 'drop'): void {
		if (!isDragEvent(event)) return;
		const items = event.dataTransfer?.items;
		isValid = (items && checkValidity(items)) ?? false;

		if (preventDefaultForUnhandled) event.preventDefault();

		// An unusable drag must not be prevented, or the browser would promise a
		// drop that then never arrives.
		if (!isSafari() && !isValid) {
			if (event.dataTransfer) event.dataTransfer.dropEffect = 'none';
			return;
		}

		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';

		switch (eventType) {
			case 'enter':
				counter += 1;
				isOverDropZone = true;
				config.onEnter?.(null, event);
				break;
			case 'over':
				config.onOver?.(null, event);
				break;
			case 'leave':
				// Clamped: upstream decrements into the negatives, and once `counter`
				// sits below zero the next enter/leave pair leaves `isOverDropZone`
				// stuck on forever, because `counter === 0` is never true again.
				counter = Math.max(0, counter - 1);
				if (counter === 0) isOverDropZone = false;
				config.onLeave?.(null, event);
				break;
			case 'drop':
				counter = 0;
				isOverDropZone = false;
				if (isValid) {
					// Read here rather than once per event as upstream does: `getFiles`
					// is pure, and the only branch that uses the answer is this one.
					const dropped = getFiles(event);
					files = dropped;
					config.onDrop?.(dropped, event);
				}
				break;
		}
	}

	useEventListener(target, 'dragenter', (event) => handleDragEvent(event, 'enter'));
	useEventListener(target, 'dragover', (event) => handleDragEvent(event, 'over'));
	useEventListener(target, 'dragleave', (event) => handleDragEvent(event, 'leave'));
	useEventListener(target, 'drop', (event) => handleDragEvent(event, 'drop'));

	return {
		get files() {
			return files;
		},
		get isOverDropZone() {
			return isOverDropZone;
		}
	};
}
