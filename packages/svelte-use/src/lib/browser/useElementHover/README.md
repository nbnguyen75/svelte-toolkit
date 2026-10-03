# `useElementHover`

Reactive hover state for an element, with optional enter / leave delays.
Inspired by [VueUse `useElementHover`](https://vueuse.org/core/useElementHover/).

## Signature

```ts
import { useElementHover } from '@wynn-dev/svelte-use';

const isHovered = useElementHover(() => panel, { delayEnter: 200 });

console.log(isHovered.value); // false until the pointer settles
```

## Options

| Option             | Type      | Default | Description                                                |
| ------------------ | --------- | ------- | ---------------------------------------------------------- |
| `delayEnter`       | `number`  | `0`     | Ms to wait before reporting hover.                         |
| `delayLeave`       | `number`  | `0`     | Ms to wait before reporting the pointer left.              |
| `triggerOnRemoval` | `boolean` | `false` | Also report "not hovered" when the element leaves the DOM. |

## Returns

| Field   | Type      | Reactive | Description                     |
| ------- | --------- | -------- | ------------------------------- |
| `value` | `boolean` | getter   | Whether the pointer is over it. |

## Examples

### Tooltip that ignores a passing pointer

```svelte
<script lang="ts">
	import { useElementHover } from '@wynn-dev/svelte-use';

	let tip = $state<HTMLElement>();
	const isHovered = useElementHover(() => tip, { delayEnter: 200, delayLeave: 100 });
</script>

<div bind:this={tip}>
	hover me
	{#if isHovered.value}<span class="tip">details</span>{/if}
</div>
```

### Reveal on hover

```svelte
<script lang="ts">
	import { useElementHover } from '@wynn-dev/svelte-use';

	let row = $state<HTMLElement>();
	const isHovered = useElementHover(() => row);
</script>

<tr bind:this={row} class:highlighted={isHovered.value}>…</tr>
```

## Edge cases & cleanup

- **`mouseenter` / `mouseleave`, not `mouseover` / `mouseout`.** The bubbling pair
  fires again for every descendant, so a pointer moving to a child would read as
  a leave. The non-bubbling pair fires once for the element itself.
- **A pending toggle is cancelled, never queued.** A pointer that crosses an
  element in under `delayEnter` never reports a hover, and a pointer that returns
  during `delayLeave` never reports a leave.
- **A delay of `0` (the default) is synchronous**, so the common case costs
  nothing. `0` is not routed through `setTimeout`.
- **A settled timer is cleared,** so a long-done hover cannot flip again.
- **Unmounting cancels a pending delay.** Without that, a `delayEnter` scheduled
  just before teardown would write state to a destroyed component.
- **`triggerOnRemoval` covers an ancestor removal too,** not just the element's
  own. A node is a removal if it _is_ the element or if it still contains it.
- **`triggerOnRemoval` observes the whole document** (`childList` + `subtree`),
  which is the only way to notice a removal anywhere up the tree. It is off by
  default; scope it to a subtree if the document is large.
- A `null` element attaches nothing and reports `false`.
- Must be called in component initialization (uses `$state` / `$effect`).

## Parity notes

- The element is typed as `Element`, not `EventTarget`. Hover is meaningless on a
  `window` or a `Document`, and the narrower type is what lets the removal check
  call `contains` without an assertion.
- VueUse leaks a pending `setTimeout` on unmount; this port clears it.
- `value` is a getter-backed object rather than a ref, so destructuring keeps
  reactivity.
- The removal check is an inline `MutationObserver`; it becomes
  feat-017's `useMutationObserver` / `onElementRemoval` once those land.
