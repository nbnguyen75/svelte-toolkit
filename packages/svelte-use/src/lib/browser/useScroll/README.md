# `useScroll`

Reactive scroll position, edge arrival, and travel direction for an element,
document, or window. Inspired by [VueUse `useScroll`](https://vueuse.org/core/useScroll/).

## Signature

```ts
import { useScroll } from '@wynn-dev/svelte-use';

const scroll = useScroll(() => listEl);

scroll.y = 400; // jump 400px down
scroll.arrivedState.bottom; // true when parked at the end
scroll.directions.bottom; // true while still moving down
```

## Options

| Option                 | Type                                 | Default                             | Description                                                           |
| ---------------------- | ------------------------------------ | ----------------------------------- | --------------------------------------------------------------------- |
| `throttle`             | `number`                             | `0`                                 | Ms between state updates. `0` disables throttling.                    |
| `idle`                 | `number`                             | `200`                               | Quiet period before `isScrolling` clears. Delay is `throttle + idle`. |
| `offset`               | `{ left?, right?, top?, bottom? }`   | `{}`                                | Extra pixels of slack before an edge counts as arrived.               |
| `observe`              | `boolean \| { mutation? }`           | `false`                             | Re-measure when the container's DOM changes.                          |
| `behavior`             | `MaybeGetter<ScrollBehavior>`        | `'auto'`                            | Behavior used when `x` or `y` is assigned.                            |
| `eventListenerOptions` | `AddEventListenerOptions \| boolean` | `{ capture: false, passive: true }` | Flags for the scroll listeners.                                       |
| `onScroll`             | `(e: Event) => void`                 | no-op                               | Fires on every scroll event, after the state updates.                 |
| `onStop`               | `(e: Event) => void`                 | no-op                               | Fires once when scrolling ends.                                       |
| `onError`              | `(error: unknown) => void`           | `console.error`                     | Called when a measure throws.                                         |

## Returns

| Field          | Type             | Reactive | Description                                               |
| -------------- | ---------------- | -------- | --------------------------------------------------------- |
| `x`            | `number`         | get/set  | Horizontal offset. Assigning scrolls there.               |
| `y`            | `number`         | get/set  | Vertical offset. Assigning scrolls there.                 |
| `isScrolling`  | `boolean`        | getter   | True from a scroll event until `idle` ms of quiet.        |
| `arrivedState` | `UseScrollEdges` | getter   | `left` / `right` / `top` / `bottom`.                      |
| `directions`   | `UseScrollEdges` | getter   | Which way the container moved since the last measurement. |
| `measure`      | `() => void`     | method   | Re-read the scroll metrics now.                           |

`arrivedState` and `directions` are stable getter-backed objects, so
`scroll.arrivedState.bottom` stays reactive and `Object.keys` on them is not
needed to discover the edges.

## Examples

### Infinite list

```svelte
<script lang="ts">
	import { useScroll } from '@wynn-dev/svelte-use';

	let listEl = $state<HTMLElement>();
	let page = $state(1);

	const scroll = useScroll(() => listEl, { throttle: 100 });

	$effect(() => {
		if (scroll.arrivedState.bottom) page += 1;
	});
</script>

<div bind:this={listEl}>
	{#each items as item}<Item {item} />{/each}
</div>
```

### Jump to the top

```svelte
<script lang="ts">
	import { useScroll } from '@wynn-dev/svelte-use';

	const scroll = useScroll(() => listEl, { behavior: 'smooth' });
</script>

<button onclick={() => (scroll.y = 0)}>top</button>
```

### Window scroll progress

```svelte
<script lang="ts">
	import { useScroll } from '@wynn-dev/svelte-use';

	const scroll = useScroll(() => window);
	const progress = $derived(scroll.arrivedState.bottom ? 1 : scroll.y);
</script>

<div class="progress" style:width="{progress}%"></div>
```

## Edge cases & cleanup

- **`throttle + idle` is the scroll-end delay.** With `throttle: 100` the debounce
  waits 300 ms, so a long throttle cannot leave `isScrolling` stuck on.
- **The last pixel belongs to `arrivedState`.** `scrollTop` is unrounded while
  `scrollHeight` is rounded, so the threshold subtracts 1px — otherwise
  `arrivedState.bottom` flickers on the final pixel.
- **`scrollend` is deduped against the debounce**, not trusted alone: whichever
  arrives first clears the flags, and the other returns early.
- **`row-reverse` / `column-reverse` flex containers swap edges**, because they
  genuinely reverse which measurement maps to which edge.
- **Assigning `x`/`y` is safe when the container cannot scroll itself.** The
  write is skipped if `scrollTo` is missing, and the read-back still updates the
  reported offset.
- **`observe` creates one `MutationObserver` per call** and disconnects it on
  unmount. It is off by default; `window` and `document` targets are skipped
  because they are not valid mutation targets.
- **Unmounting cancels the pending scroll-end timer and the throttle window**, so
  neither can write state after teardown.
- The initial measure runs in an `$effect` with `untrack`, because
  `setArrivedState` both reads and writes the offsets — a tracked call would
  re-trigger itself on every scroll.
- A target getter is re-resolved on every read and on every effect run, so
  `bind:this` swapping the element needs no re-mount.
- Must be called in component initialization (uses `$state` / `$effect`).

## Parity notes

- **VueUse's rtl branch is dropped.** It multiplies the horizontal offset by `-1`
  when `direction === 'rtl'`, but the surrounding `Math.abs` already normalizes
  the sign — `Math.abs(x * -1) === Math.abs(x)`, so it can never change a result.
  Negative `scrollLeft` values, which is how browsers report an rtl container,
  are handled by the `Math.abs` alone.
- **A `Document` target resolves to `documentElement`, not `document.body`.**
  VueUse _writes_ to `body` but _reads_ from `documentElement`; this port uses
  `documentElement` for both so reads and writes agree in standards mode.
- `arrivedState` and `directions` are getter-backed objects rather than reactive
  refs, and `x`/`y` are writable getters rather than writable computed refs.
- No `window` / `eventFilter` / `onError`-by-default option plumbing: the element
  is a getter, and rate limiting is `throttle` or `useThrottleFn`.
- `behavior` accepts a getter, so it can be driven by reactive state.
