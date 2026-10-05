# `useMouseInElement`

Reactive mouse position relative to an element. Inspired by
[VueUse `useMouseInElement`](https://vueuse.org/core/useMouseInElement/).

## Signature

```ts
import { useMouseInElement } from '@wynn-dev/svelte-use';

const { elementX, elementY, isOutside } = useMouseInElement(() => card);

console.log(elementX, elementY, isOutside);
```

The `target` defaults to `document.body`.

## Options

Every [`useMouse`](../useMouse/README.md) option is accepted and forwarded.

| Option          | Type      | Default | Description                                                |
| --------------- | --------- | ------- | ---------------------------------------------------------- |
| `handleOutside` | `boolean` | `true`  | Keep following the cursor while it is outside the element. |
| `windowScroll`  | `boolean` | `true`  | Re-measure on window scroll.                               |
| `windowResize`  | `boolean` | `true`  | Re-measure on window resize.                               |

## Returns

| Field              | Type                         | Reactive | Description                                        |
| ------------------ | ---------------------------- | -------- | -------------------------------------------------- |
| `x`, `y`           | `number`                     | getter   | Cursor position in the configured space.           |
| `sourceType`       | `'mouse' \| 'touch' \| null` | getter   | Last device to report.                             |
| `elementX`         | `number`                     | getter   | Cursor X relative to the element's top-left.       |
| `elementY`         | `number`                     | getter   | Cursor Y relative to the element's top-left.       |
| `elementPositionX` | `number`                     | getter   | The element's X position in that space.            |
| `elementPositionY` | `number`                     | getter   | The element's Y position in that space.            |
| `elementWidth`     | `number`                     | getter   | The element's width.                               |
| `elementHeight`    | `number`                     | getter   | The element's height.                              |
| `isOutside`        | `boolean`                    | getter   | Whether the cursor is outside, or there is no box. |
| `stop`             | `() => void`                 | —        | Stop the element-relative tracking.                |

## Examples

### Highlight on hover

```svelte
<script lang="ts">
	import { useMouseInElement } from '@wynn-dev/svelte-use';

	let card = $state<HTMLDivElement>();
	const { elementX, elementY, isOutside } = useMouseInElement(() => card);
</script>

<div bind:this={card} style:transform="translate({elementX}px, {elementY}px)">
	{#if isOutside}away{:else}{elementX}, {elementY}{/if}
</div>
```

### Freeze the position while outside

```svelte
<script lang="ts">
	import { useMouseInElement } from '@wynn-dev/svelte-use';

	let card = $state<HTMLDivElement>();
	// The badge keeps its last in-bounds offset instead of following the cursor away.
	const { elementX, elementY } = useMouseInElement(() => card, { handleOutside: false });
</script>

<div bind:this={card}><span style:left="{elementX}px">{elementY}</span></div>
```

### Client coordinates only

```svelte
<script lang="ts">
	import { useMouseInElement } from '@wynn-dev/svelte-use';

	let board = $state<HTMLDivElement>();
	const { elementX, elementY } = useMouseInElement(() => board, { type: 'client' });
</script>

<div bind:this={board}>{elementX}, {elementY}</div>
```

## Edge cases & cleanup

- **The box is observed, not re-measured per pointer move.** A `ResizeObserver`
  and a `MutationObserver` on `style` / `class` re-measure when the element can
  actually have changed, which is what keeps this cheap on a busy page.
- **Every `getClientRects()` box is checked.** An inline element wrapped across
  lines reports several, and it counts as inside only when the cursor is within
  one of them.
- **A zero-area box counts as outside**, so a collapsed or `display: none`
  element cannot report a hit.
- **An element with no boxes leaves every value untouched**, rather than
  reporting a position of zero.
- **`handleOutside: false` keeps the last in-bounds `elementX` / `elementY`,**
  while `isOutside` still tracks the cursor.
- **`mouseleave` on the document marks the cursor outside**, which is how a
  cursor that left the window stops reading as inside.
- **Page coordinates add the window offset to the element position**, and client
  coordinates do not. A custom `type` extractor is treated as non-page, matching
  upstream.
- **`stop()` releases the listeners and disconnects the observers.**
  `useMouse` keeps following the cursor, so `x` and `y` stay live.
- Must be called in component initialization (uses `$state` / `$effect`).

## Parity notes

- **`stop()` is kept, and the internal `bindListener` is what makes it real.**
  The public `useEventListener` returns nothing, so a util that needs to hand back
  a `stop()` binds through the internal helper and holds the detachers.
- **The upstream option comments for `windowScroll` and `windowResize` are
  swapped**; they are documented correctly here.
- **No `instanceof` check.** The `target` is typed as an element or `null`, so
  the runtime check upstream needs for its untyped ref has nothing to guard.
