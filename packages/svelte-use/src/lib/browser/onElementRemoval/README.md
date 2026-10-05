# `onElementRemoval`

Calls back when an element, or any ancestor of it, leaves the DOM. Inspired by
[VueUse `onElementRemoval`](https://vueuse.org/core/onElementRemoval/).

## Signature

```ts
import { onElementRemoval } from '@wynn-dev/svelte-use';

const stop = onElementRemoval(
	() => node,
	(records) => console.log('gone')
);
```

## Options

| Option     | Type                                   | Default           | Description          |
| ---------- | -------------------------------------- | ----------------- | -------------------- |
| `document` | `Document \| (() => Document \| null)` | global `document` | Document to observe. |

## Arguments

| Argument   | Type                                   | Description                                |
| ---------- | -------------------------------------- | ------------------------------------------ |
| `target`   | `Node \| null \| (() => Node \| null)` | Element to watch, or a getter re-resolved. |
| `callback` | `(records: MutationRecord[]) => void`  | Called with the records that removed it.   |

## Returns

`stop()` — stops watching. Idempotent, and safe to call off the browser.

## Examples

### Clean up when a node leaves

```svelte
<script lang="ts">
	import { onElementRemoval } from '@wynn-dev/svelte-use';

	let node = $state<HTMLDivElement>();
	onElementRemoval(
		() => node,
		() => {
			cleanup();
		}
	);
</script>

<div bind:this={node}></div>
```

### React to a list row leaving

```svelte
<script lang="ts">
	import { onElementRemoval } from '@wynn-dev/svelte-use';

	let row = $state<HTMLLIElement>();
	// Fires when the row itself is removed *or* when its `<ul>` is.
	onElementRemoval(
		() => row,
		() => {
			save();
		}
	);
</script>

<ul>
	<li bind:this={row}>{label}</li>
</ul>
```

## Edge cases & cleanup

- **The document is observed, not the element.** A `MutationObserver` cannot
  watch an element for its own removal — once it is detached, nothing observes it
  — so this watches `document.body` with `subtree: true` and checks each batch of
  removed nodes.
- **An ancestor's removal counts.** `node === element` covers the direct case and
  `node.contains(element)` the indirect one, which is what matters for anything
  inside a list.
- **A `target` that resolves later is picked up.** The target getter is read where
  the observer subscribes, so a `bind:this` that lands after mount starts being
  watched instead of being silently skipped.
- **Only `childList` is observed.** Attribute changes cannot remove a node, so
  watching them would be cost with no behaviour attached.
- **The records are passed through verbatim** — the native `MutationRecord`s, not a
  filtered copy — so a caller can inspect `removedNodes` itself.
- **`stop()` is the observer's own `stop`**, which also prevents the document being
  re-observed if the target changes afterwards.
- **Off the browser there is nothing to observe**, so the callback never fires and
  `stop()` is a no-op rather than a throw.
- Must be called in component initialization (uses `$effect`, via
  `useMutationObserver`).

## Parity notes

- **Composes the shipped `useMutationObserver`** and adds no observer of its own.
- **No `window` / `document` pair of options.** Upstream takes both because Vue's
  `defaultWindow` plumbing is ambient; a single `document` is the same choice with
  one fewer knob to get wrong.
- **`flush` is gone.** Upstream's `'sync' | 'pre' | 'post'` is a Vue scheduler
  concept. A `MutationObserver` callback is already a microtask, so the Svelte
  equivalent of `flush: 'sync'` is what this already is.
- **Reads from `$derived` rather than an effect**, because Svelte forbids creating
  an `$effect` inside another one and `useMutationObserver` owns its own.
