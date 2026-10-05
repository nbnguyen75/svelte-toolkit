import type { MaybeGetter } from '../../shared/getter.ts';

import { resolveGetter } from '../../shared/getter.ts';
import { isBrowser } from '../../shared/is.ts';
import { useRafFn } from '../../utilities/useRafFn/index.ts';

/** Options for {@link useElementByPoint}. */
export interface UseElementByPointOptions {
	/**
	 * Return every element under the point instead of only the topmost.
	 *
	 * @default false
	 */
	multiple?: MaybeGetter<boolean | undefined>;
	/**
	 * Viewport X to hit-test, in CSS pixels. Read on every frame, so a getter
	 * tracks a moving cursor.
	 */
	x: MaybeGetter<number>;
	/**
	 * Viewport Y to hit-test, in CSS pixels. Read on every frame, so a getter
	 * tracks a moving cursor.
	 */
	y: MaybeGetter<number>;
}

/** Reactive hit-test result returned by {@link useElementByPoint}. */
export interface UseElementByPointReturn {
	/**
	 * The hit element, or `null` off the browser, before the first frame, and
	 * while `pause`d. Getter-backed.
	 */
	readonly element: Element | readonly Element[] | null;
	/**
	 * Whether this environment can hit-test the point under the current `multiple`
	 * mode. Getter-backed: `false` during SSR, and a browser exposing only
	 * `elementFromPoint` reports `false` once `multiple` is on.
	 */
	readonly isSupported: boolean;
	/** Whether the loop is running. Getter-backed. */
	readonly isActive: boolean;
	/** Start (or restart) hit-testing. No-op without `requestAnimationFrame`. */
	resume: () => void;
	/** Stop hit-testing until `resume`. */
	pause: () => void;
}

/**
 * Reactive element-under-a-point, hit-tested once per animation frame.
 *
 * Composes the shipped {@link useRafFn} and adds no listener, timer or observer
 * of its own.
 *
 * Must be called in component initialization.
 *
 * @param options `x`, `y` and `multiple`.
 * @returns `element`, `isActive`, `isSupported`, `pause`, `resume`.
 * @example
 * ```svelte
 * <script lang="ts">
 * 	import { useElementByPoint } from '@wynn-dev/svelte-use';
 *
 * 	let cursor = $state({ x: 0, y: 0 });
 * 	const { element } = useElementByPoint({
 * 		x: () => cursor.x,
 * 		y: () => cursor.y
 * 	});
 * </script>
 *
 * <div onpointermove={(e) => (cursor = { x: e.clientX, y: e.clientY })}>
 * 	{element?.tagName ?? 'nothing'}
 * </div>
 * ```
 */
export function useElementByPoint(options: UseElementByPointOptions): UseElementByPointReturn {
	const { multiple = false } = options;

	/**
	 * The hit-test method for the current `multiple` mode, or `null` when this
	 * document cannot hit-test.
	 *
	 * Checked per frame rather than once at setup: `elementFromPoint` and
	 * `elementsFromPoint` are plain `document` properties, and a browser can
	 * expose one without the other.
	 *
	 * A `typeof` call rather than an `in` check, which would accept a name that
	 * is present but `undefined` and then throw on the call.
	 */
	function hitTest(): ((x: number, y: number) => Element | readonly Element[] | null) | null {
		if (!isBrowser) return null;
		if (resolveGetter(multiple)) {
			return typeof document.elementsFromPoint === 'function'
				? (x, y) => document.elementsFromPoint(x, y)
				: null;
		}
		return typeof document.elementFromPoint === 'function'
			? (x, y) => document.elementFromPoint(x, y)
			: null;
	}

	// Not `$state.raw`: a frame assigns a fresh array every time, and identity is
	// what tells a template the hit target moved. An empty array rather than
	// `null` when nothing is under the point, because `elementsFromPoint` returns
	// an array and downgrading it would be the util's invention.
	let element = $state<Element | readonly Element[] | null>(null);

	function update(): void {
		const test = hitTest();
		if (!test) return;
		element = test(resolveGetter(options.x), resolveGetter(options.y));
	}

	// Not destructured: `isActive` is a getter, so destructuring would snapshot
	// `false` at setup and the loop's real state would never be readable. `pause`
	// and `resume` are plain functions and would survive destructuring, but
	// keeping the object whole is what makes that safe for every key, including
	// ones added later.
	const raf = useRafFn(update);

	return {
		get element() {
			return element;
		},
		get isActive() {
			return raf.isActive;
		},
		get isSupported() {
			// A getter, not a setup-time boolean: `multiple` is a getter too, and
			// `elementsFromPoint` can be missing where `elementFromPoint` is not.
			return hitTest() !== null;
		},
		pause: raf.pause,
		resume: raf.resume
	};
}
