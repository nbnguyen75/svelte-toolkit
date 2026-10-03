# `useMouse`

Reactive pointer position, following the mouse or the first touch. Inspired by
[VueUse `useMouse`](https://vueuse.org/core/useMouse/).

## Signature

```ts
import { useMouse } from '@wynn-dev/svelte-use';

const { x, y, sourceType } = useMouse();

console.log(x, y, sourceType); // page coords, 'mouse' | 'touch' | null
```

## Options

| Option             | Type                                                        | Default                                  | Description                                                 |
| ------------------ | ----------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------- |
| `type`             | `'client' \| 'movement' \| 'page' \| 'screen'` \| extractor | `'page'`                                 | Coordinate space, or `(event) => [x, y] \| null`.           |
| `target`           | `MaybeGetter<EventTarget \| null>`                          | `() => (isBrowser ? window : undefined)` | Element to listen on.                                       |
| `touch`            | `boolean`                                                   | `true`                                   | Also track `touchstart` / `touchmove`.                      |
| `scroll`           | `boolean`                                                   | `true`                                   | Re-anchor on window scroll. Only applies to `type: 'page'`. |
| `resetOnTouchEnds` | `boolean`                                                   | `false`                                  | Reset to `initialValue` on `touchend`.                      |
| `initialValue`     | `{ x: number; y: number }`                                  | `{ x: 0, y: 0 }`                         | Starting position, and what `resetOnTouchEnds` restores.    |

An extractor receives the `MouseEvent` or the first `Touch`, and returns `[x, y]`.
Returning `null` ignores that event.

## Returns

| Field        | Type                         | Reactive | Description                                     |
| ------------ | ---------------------------- | -------- | ----------------------------------------------- |
| `x`          | `number`                     | getter   | Horizontal position in the configured space.    |
| `y`          | `number`                     | getter   | Vertical position in the configured space.      |
| `sourceType` | `'mouse' \| 'touch' \| null` | getter   | Last device to report; `null` before any event. |

## Examples

### Follow the cursor

```svelte
<script lang="ts">
	import { useMouse } from '@wynn-dev/svelte-use';

	const { x, y } = useMouse();
</script>

<div style:transform="translate({x}px, {y}px)">cursor</div>
```

### Track a drag target

```svelte
<script lang="ts">
	import { useMouse } from '@wynn-dev/svelte-use';

	const { x, y, sourceType } = useMouse({ type: 'client' });
	const dragging = $derived(sourceType === 'mouse');
</script>

<button onpointerdown={() => console.log('grab at', x, y)} style:left="{x}px"> drag </button>
```

### Element-relative tracking

```svelte
<script lang="ts">
	import { useMouse } from '@wynn-dev/svelte-use';

	let board = $state<HTMLElement>();
	const { x, y } = useMouse({ target: () => board, type: 'client' });
</script>

<div bind:this={board}>hover me ({x}, {y})</div>
```

## Edge cases & cleanup

- **`mousemove` and `dragover` share one handler**, so the position keeps updating
  during an HTML5 drag — `mousemove` alone goes quiet once a drag starts.
- **Listeners are `passive`.** Nothing here calls `preventDefault`, so the browser
  never has to wait on the handler.
- **`type: 'movement'` is opt-in because it is not a position.** It reports
  deltas since the previous event, and it declines touch events outright, since
  a `Touch` carries no `movementX` / `movementY`.
- **Scroll compensation only applies to `type: 'page'`.** A page position is
  document-relative, so scrolling the viewport moves it by the same delta to
  stay over the same physical spot. The baseline is captured _after_ each move,
  so a repeated `scroll` event never accumulates twice, while continued
  scrolling still tracks the total document offset.
- **A touch sets no scroll baseline.** Only a mouse move anchors one, so a
  window scroll after a touch leaves the touch position alone.
- **Touch listeners are skipped entirely for `type: 'movement'`**, not just
  filtered, so nothing is attached for a device that cannot produce the value.
- **A touch with no active `touches` is ignored**, which is what `touchend` and a
  cancelled gesture look like.
- The default `target` is a getter, not a captured `window`, so setup never reads
  `window` during SSR and a swapped element is picked up without re-mounting.
- Every listener is released on unmount; no state is written after teardown.
- Must be called in component initialization (uses `$state` / `$effect`).

## Parity notes

- **A custom `type` extractor receives `MouseEvent | Touch`,** so one function
  covers both sources instead of needing an options bag per device.
- **`x` / `y` are read-only.** VueUse exposes plain refs you could write to; a
  synthetic pointer position is not something a caller can assert, so the port
  keeps the surface honest.
- `initialValue` seeds the returned getters, so the first render already has a
  value and never flashes at the origin.
- `resetOnTouchEnds` restores `initialValue` rather than a hardcoded `0`, which
  is what makes a custom starting position recoverable.
