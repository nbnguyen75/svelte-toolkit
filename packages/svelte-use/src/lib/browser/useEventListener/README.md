# `useEventListener`

SSR-safe DOM event listener with automatic disposal.
Inspired by [VueUse `useEventListener`](https://vueuse.org/core/useEventListener/).

## Signature

```ts
import { useEventListener } from '@wynn-dev/svelte-use';

useEventListener(
	() => window,
	'click',
	(event) => console.log(event)
);
useEventListener(() => element, 'keydown', handler, { once: true });
```

Overloads type `event`/`handler` per target: `Window`, `Document`,
`HTMLElement`, `MediaQueryList`, plus a generic `EventTarget` fallback.

## Options

| Parameter | Type                                  | Default     | Description                                             |
| --------- | ------------------------------------- | ----------- | ------------------------------------------------------- |
| `target`  | `MaybeGetter<… \| null \| undefined>` | (required)  | Event target, or a getter re-resolved on effect re-run. |
| `event`   | event name for the target             | (required)  | e.g. `'click'`, `'keydown'`, `'change'`.                |
| `handler` | `(event) => void`                     | (required)  | Listener invoked with the typed event.                  |
| `options` | `boolean \| AddEventListenerOptions`  | `undefined` | Capture/once/passive flags, forwarded as-is.            |

`MaybeGetter<T>` is `T | (() => T)`.

## Returns

`void`. The listener lives as long as the calling effect scope.

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { useEventListener } from '@wynn-dev/svelte-use';

	let count = $state(0);
	useEventListener(
		() => window,
		'click',
		() => (count += 1)
	);
</script>

<button>clicked {count} times (anywhere)</button>
```

### SSR behavior

No-op on the server: without `window`/`document` nothing is attached and
nothing throws. The listener attaches on mount and re-attaches if a getter
target resolves differently. Works with or without SvelteKit (no `$app/*`).

## Edge cases & cleanup

- The listener is removed automatically when the component unmounts (cleanup
  returned from `$effect`).
- Nullish targets are a safe no-op — useful for elements bound later via
  `bind:this` guarded by a getter.
- Because the target is re-resolved on every effect run, a getter returning
  `bind:this` state re-attaches automatically once the element exists.
- Must be called in component initialization (uses `$effect`).

## Parity notes

- Mirrors VueUse semantics; `MaybeGetter<T>` replaces Vue's
  `MaybeRefOrGetter`. No `isActive`/`stop` handle — unmount is the disposal
  mechanism.
- VueUse additionally accepts arrays of targets, events, and listeners, and
  returns a `stop` function. This port takes a single target/event/handler and
  returns `void`; wrap the call in an `$effect` if you need manual re-attachment
  control.
