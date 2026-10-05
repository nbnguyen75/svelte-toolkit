import type { MaybeElement } from '../../shared/element.ts';
import type { MaybeGetter } from '../../shared/getter.ts';

import { resolveGetter } from '../../shared/getter.ts';
import { isBrowser, isElement, noop } from '../../shared/is.ts';
import { bindListener } from '../useEventListener/bind.ts';

/**
 * True when the `lock` source is the triggering `Event`.
 *
 * A wrapper rather than a bare `instanceof`, so that the `typeof Event` check is
 * inside the guard — outside it, TypeScript cannot narrow the negative branch.
 */
function isEventLike(value: Element | Event | null | undefined): value is Event {
	return typeof Event !== 'undefined' && value instanceof Event;
}

/** Options for {@link usePointerLock}. */
export interface UsePointerLockOptions {
	/**
	 * Document that owns the lock, or a getter re-resolved on every effect run.
	 * Defaults to the global `document`.
	 */
	document?: MaybeGetter<Document | null | undefined>;
}

/** Reactive pointer lock state returned by {@link usePointerLock}. */
export interface UsePointerLockReturn {
	/**
	 * Request the lock and resolve once the browser grants it.
	 *
	 * @param target Element to lock, or the triggering `Event` to take the
	 * element from `currentTarget`.
	 * @throws If unsupported, or if there is no element to lock.
	 */
	lock: (target: MaybeGetter<Element | Event | null | undefined>) => Promise<Element>;
	/**
	 * The element whose event triggered the lock, when `lock` was called from an
	 * event handler. `null` when `lock` was passed an element directly.
	 */
	readonly triggerElement: MaybeElement;
	/** The locked element, or `null`/`undefined` while unlocked. Getter-backed. */
	readonly element: MaybeElement;
	/** Release the lock. Resolves `false` when nothing was locked. */
	unlock: () => Promise<boolean>;
	/** Whether this environment has the Pointer Lock API. Always `false` during SSR. */
	readonly isSupported: boolean;
}

/**
 * Reactive Pointer Lock, for a drag-to-rotate or a pointer-follow cursor.
 *
 * Binds two document listeners through
 * `useEventListener/bind.ts`, since `document` changes are the only input.
 *
 * Must be called in component initialization.
 *
 * @param target Fallback element to lock, or a getter re-resolved on every effect run. Used when `lock` receives an `Event`.
 * @param options `document`.
 * @returns `element`, `triggerElement`, `isSupported`, `lock`, `unlock`.
 * @example
 * ```svelte
 * <script lang="ts">
 * 	import { usePointerLock } from '@wynn-dev/svelte-use';
 *
 * 	let canvas: HTMLCanvasElement;
 * 	const { element, lock, unlock, isSupported } = usePointerLock(() => canvas);
 * </script>
 *
 * <canvas
 * 	bind:this={canvas}
 * 	onpointerdown={isSupported ? () => lock(canvas) : undefined}
 * />
 * ```
 */
export function usePointerLock(
	target?: MaybeGetter<Element | null | undefined>,
	options: UsePointerLockOptions = {}
): UsePointerLockReturn {
	const doc = $derived.by(() => {
		const resolved = resolveGetter(options.document);
		return resolved === undefined ? (isBrowser ? document : null) : resolved;
	});

	const isSupported = isBrowser && 'pointerLockElement' in document;

	let element = $state<MaybeElement>(null);
	let triggerElement = $state<MaybeElement>(null);
	// Plain, not `$state`: it identifies which element the browser is expected to
	// have locked, and the `pointerlockchange` event is the only thing that moves
	// it. Making it reactive would re-arm the listener effect below.
	let targetElement: Element | null = null;

	// Settled by the effect below rather than by `until`, which builds its own
	// `$effect`. `lock` is called from a click handler, long after component init,
	// and an effect created there has no owner: Svelte throws `effect_orphan`.
	// This waits on an effect that was created during init instead.
	let settle: ((current: MaybeElement) => void) | null = null;
	/** Rejecters for a lock that never arrived, drained on unmount. */
	const onDestroyed: (() => void)[] = [];

	$effect(() => {
		// Reading `element` is the whole subscription.
		const current = element;
		if (!settle) return;
		const done = settle;
		settle = null;
		done(current);
	});

	/**
	 * Resolves from the effect above once `predicate` accepts the lock state.
	 *
	 * `predicate` is a type guard rather than a boolean test, so the matched value
	 * arrives already narrowed and neither this nor the caller has to assert it.
	 *
	 * Rejects if the component unmounts first, so an awaiting caller is never left
	 * hanging on a destroyed util.
	 */
	function awaitLock<T extends MaybeElement>(
		predicate: (current: MaybeElement) => current is T
	): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			settle = (current) => {
				if (predicate(current)) resolve(current);
			};
			if (predicate(element)) {
				settle = null;
				resolve(element);
				return;
			}
			const check = () => {
				if (settle === null) return;
				reject(new Error('usePointerLock: unmounted while awaiting the pointer lock.'));
			};
			onDestroyed.push(check);
		});
	}

	$effect(() => {
		// Teardown: an awaited `lock` that has not been granted must not hang
		// forever once the component is gone.
		return () => {
			while (onDestroyed.length) onDestroyed.pop()?.();
		};
	});

	$effect(() => {
		const currentDocument = doc;
		if (!currentDocument || !isSupported) return noop;

		const onChange = (): void => {
			// `pointerLockElement` is `null` on unlock, so fall back to what we
			// already had: that is the only way to tell "released" from "someone
			// else took it".
			const current = currentDocument.pointerLockElement ?? element;
			if (targetElement && current === targetElement) {
				element = currentDocument.pointerLockElement;
				// Released: drop the expectation, so a later change by an unrelated
				// element is ignored.
				if (!element) targetElement = triggerElement = null;
			}
		};

		const onError = (): void => {
			const current = currentDocument.pointerLockElement ?? element;
			if (targetElement && current === targetElement) {
				const action = currentDocument.pointerLockElement ? 'release' : 'acquire';
				throw new Error(`Failed to ${action} pointer lock.`);
			}
		};

		const detach = [
			bindListener(currentDocument, 'pointerlockchange', onChange, { passive: true }),
			bindListener(currentDocument, 'pointerlockerror', onError, { passive: true })
		];
		return () => {
			for (const off of detach) off();
		};
	});

	async function lock(source: MaybeGetter<Element | Event | null | undefined>): Promise<Element> {
		if (!isSupported) throw new Error('Pointer Lock API is not supported by your browser.');
		const currentDocument = doc;
		if (!currentDocument) throw new Error('Target element undefined.');

		const resolved = resolveGetter(source);
		// An `Event` is the browser's requirement for a user-gesture lock; reading
		// `currentTarget` after the handler returns would give `null`, which is why
		// it is captured here, while the handler is still running.
		if (isEventLike(resolved)) {
			triggerElement = isElement(resolved.currentTarget) ? resolved.currentTarget : null;
			targetElement = resolveGetter(target) ?? triggerElement ?? null;
		} else {
			// Narrowed by the `instanceof` above: an `Event` cannot reach this branch.
			triggerElement = null;
			targetElement = resolved ?? null;
		}

		// Narrowed by the throw below. `requestPointerLock` is declared on `Element`,
		// so no cast and no optional chain are needed.
		const lockedElement = targetElement;
		if (!lockedElement) throw new Error('Target element undefined.');

		// No options object: `unadjustedMovement` is not in every engine's
		// `PointerLockOptions` type, and the call needs none. The promise is
		// deliberately not awaited: the outcome arrives as `pointerlockchange` or
		// `pointerlockerror`, which the listener effect above already reports.
		void lockedElement.requestPointerLock();

		return awaitLock((current): current is Element => current === lockedElement);
	}

	async function unlock(): Promise<boolean> {
		const currentDocument = doc;
		if (!element || !currentDocument) return false;
		currentDocument.exitPointerLock();
		await awaitLock((current): current is null => current === null);
		return true;
	}

	return {
		get element() {
			return element;
		},
		get triggerElement() {
			return triggerElement;
		},
		isSupported,
		lock,
		unlock
	};
}
