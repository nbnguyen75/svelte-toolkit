# `usePointerLock`

Reactive Pointer Lock, for a drag-to-rotate canvas or a pointer-follow cursor.
Inspired by [VueUse `usePointerLock`](https://vueuse.org/core/usePointerLock/).

## Signature

```ts
import { usePointerLock } from '@wynn-dev/svelte-use';

const { element, lock, unlock, isSupported } = usePointerLock(() => canvas);
```

## Options

| Option     | Type                                   | Default           | Description                  |
| ---------- | -------------------------------------- | ----------------- | ---------------------------- |
| `document` | `Document \| (() => Document \| null)` | global `document` | Document that owns the lock. |

## Returns

| Field            | Type                           | Reactive | Description                                          |
| ---------------- | ------------------------------ | -------- | ---------------------------------------------------- |
| `element`        | `Element \| null`              | getter   | The locked element, `null` while unlocked.           |
| `triggerElement` | `Element \| null`              | getter   | Element whose event triggered the lock.              |
| `isSupported`    | `boolean`                      | —        | Whether the Pointer Lock API exists. `false` in SSR. |
| `lock`           | `(target) => Promise<Element>` | —        | Request the lock.                                    |
| `unlock`         | `() => Promise<boolean>`       | —        | Release the lock.                                    |

## Examples

### Drag to rotate

```svelte
<script lang="ts">
	import { usePointerLock } from '@wynn-dev/svelte-use';

	let canvas = $state<HTMLCanvasElement>();
	const { element, lock, unlock, isSupported } = usePointerLock(() => canvas);
	let angle = $state(0);

	$effect(() => {
		if (!element) return;
		const onMove = (e: MouseEvent) => (angle += e.movementX);
		document.addEventListener('mousemove', onMove);
		return () => document.removeEventListener('mousemove', onMove);
	});
</script>

<canvas bind:this={canvas} onpointerdown={isSupported ? () => lock(canvas) : undefined}>
	{angle}°
</canvas>
```

### Lock from the event itself

```svelte
<script lang="ts">
	import { usePointerLock } from '@wynn-dev/svelte-use';

	const { element, lock } = usePointerLock();
	let viewport = $state<HTMLDivElement>();
</script>

<!-- The browser requires a user gesture, so the event is passed straight through. -->
<div bind:this={viewport} onpointerdown={(e) => lock(e)}>
	{element ? 'locked' : 'click to lock'}
</div>
```

## Edge cases & cleanup

- **`lock` resolves only once the browser grants the lock**, not when it is
  requested. `requestPointerLock` is async and the grant arrives as a
  `pointerlockchange` event.
- **An ungranted `lock` rejects on unmount**, so an awaiting caller is never left
  hanging on a destroyed component.
- **`unlock()` resolves `false` when nothing was locked**, rather than throwing or
  calling `exitPointerLock` for nothing.
- **A lock change for an unrelated element is ignored.** Only a `pointerlockchange`
  whose element matches the requested one updates state, so another component
  taking the lock cannot hijack this one.
- **`pointerlockElement` is `null` on release**, so the previous value is used to
  tell "released" from "someone else took it".
- **`pointerlockerror` throws for the tracked element only** — with the action in
  the message, since acquire and release fail for different reasons.
- **Passing an `Event` reads `currentTarget` immediately.** The browser requires a
  user gesture for a lock, and `currentTarget` is `null` once the handler returns.
  `triggerElement` records it, and the `target` getter is the fallback.
- **`document` can be supplied**, for an iframe or a second document; it is read
  from a `$derived`, so a getter that changes re-binds the listeners.
- **The document listeners are released on unmount.**
- **Must be called in component initialization** (uses `$state` / `$derived` /
  `$effect`).

## Parity notes

- **Does not use `until`.** `until` builds its own `$effect`, and `lock` is called
  from an event handler long after component init, where an effect created there
  has no owner and Svelte throws `effect_orphan`. The pending promise is settled by
  an effect created during init instead.
- **`lock` and `unlock` return real promises.** Upstream returns
  `Promise<MaybeElement>`, which admits `null` although a granted lock is never
  null; `Element` is the honest type.
- **`pointerLockOptions` is omitted.** Upstream has it commented out too, since
  `unadjustedMovement` is not in every engine's `PointerLockOptions` type.
- **Binds through the internal `bindListener`.** The public `useEventListener`
  returns nothing, and this util needs its listeners scoped to a `$derived`
  document that can change.
