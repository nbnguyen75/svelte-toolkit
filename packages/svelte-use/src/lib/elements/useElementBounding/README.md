# `useElementBounding`

Track an element's position and size.

> Ported from [`vueuse/core/useElementBounding`](https://github.com/vueuse/vueuse/tree/main/packages/core/useElementBounding).

## Signature

```ts
import { useElementBounding } from '@wynn-dev/svelte-use';

const { x, y, width, height, top, right, bottom, left, update } = useElementBounding(() => card, {
	windowScroll: true,
	windowResize: true,
	updateTiming: 'next-frame'
});
```

Call it during component initialization — it wires listeners inside `$effect`, so a
`bind:this` that resolves later is picked up.

## Parameters

| Parameter | Type                        | Description                             |
| --------- | --------------------------- | --------------------------------------- |
| `element` | `MaybeGetter<MaybeElement>` | Element to measure, or a getter for it. |
| `options` | `UseElementBoundingOptions` | See below.                              |

### Options

| Option         | Type                     | Default  | Description                                          |
| -------------- | ------------------------ | -------- | ---------------------------------------------------- |
| `reset`        | `boolean`                | `true`   | Zero the box when the element goes away.             |
| `windowScroll` | `boolean`                | `true`   | Re-measure on scroll, including nested scroll boxes. |
| `windowResize` | `boolean`                | `true`   | Re-measure when the window resizes.                  |
| `updateTiming` | `'sync' \| 'next-frame'` | `'sync'` | Measure immediately, or on the next animation frame. |

## Returns

| Field    | Type         | Reactivity                                                          |
| -------- | ------------ | ------------------------------------------------------------------- |
| `x`      | `number`     | Getter-backed `$state`; reading it in an effect or template tracks. |
| `y`      | `number`     | Getter-backed `$state`.                                             |
| `width`  | `number`     | Getter-backed `$state`.                                             |
| `height` | `number`     | Getter-backed `$state`.                                             |
| `top`    | `number`     | Getter-backed `$state`.                                             |
| `right`  | `number`     | Getter-backed `$state`.                                             |
| `bottom` | `number`     | Getter-backed `$state`.                                             |
| `left`   | `number`     | Getter-backed `$state`.                                             |
| `update` | `() => void` | Force a re-measure, e.g. after a change no observer can see.        |

All eight numeric fields read `0` before the first measurement, and while no element is
attached when `reset` is on.

## Examples

### Tooltip placement

```svelte
<script lang="ts">
	import { useElementBounding } from '@wynn-dev/svelte-use';

	let anchor = $state<HTMLButtonElement>();
	const { top, left, height } = useElementBounding(() => anchor);
</script>

<button bind:this={anchor}>anchor</button>
<div class="tooltip" style:top="{top + height}px" style:left="{left}px" aria-hidden="true"></div>

<style>
	.tooltip {
		position: fixed;
	}
</style>
```

### Panel that follows its content

```svelte
<script lang="ts">
	import { useElementBounding } from '@wynn-dev/svelte-use';

	let panel = $state<HTMLDivElement>();
	// A style or class change is the usual reason to re-measure, and it fires
	// no resize event - which is why the mutation observer is there.
	const { width } = useElementBounding(() => panel);
</script>

<div bind:this={panel} style:width="{width}px">resizes with its content</div>
```

### Measure once per frame during a drag

```svelte
<script lang="ts">
	import { useElementBounding } from '@wynn-dev/svelte-use';

	let handle = $state<HTMLDivElement>();
	// Coalescing a burst of scroll/resize reports into one read per frame.
	const { x } = useElementBounding(() => handle, { updateTiming: 'next-frame' });
</script>
```

## Edge cases & cleanup

- **Re-measures on more than resize.** A `ResizeObserver` catches box changes, but not a
  `transform`, a `position: sticky` shift, or a scrolled ancestor moving the element while
  its own box stays the same size — so window `scroll` is watched in the **capture** phase
  and `style` / `class` attribute changes go through a `MutationObserver`. Turn
  `windowScroll` or `windowResize` off if that is not worth the listeners.
- **The target moving in the DOM tree** is not watched. A `MutationObserver` on `childList`
  plus an ancestor `subtree` would be the fix; call `update()` after your own DOM moves.
- **`update` is safe to call with no element** and does nothing under SSR, where there is no
  `requestAnimationFrame` to defer to.
- Every listener and both observers are removed when the target changes or the component
  unmounts. No timers are left running.

## Parity notes

- **No `immediate` option.** VueUse accepts `immediate` and then never reads it, so an
  immediate measurement is made unconditionally anyway. That is the behaviour kept here, so
  passing it through would only add an option that does nothing.
- **One getter object, not eight refs.** VueUse returns a `ComputedRef` per field; eight
  `.value`s per read is noise in Svelte, and the package convention is getter properties,
  which also survive destructuring.
- **All fields update together**, from one `getBoundingClientRect()` read, so the numbers
  are always a consistent snapshot. VueUse reads the rect once per field too, but each
  field is a separate ref.
- **Single element, not an array.** A bounding box per element is meaningful and each field
  could be an array of lengths, but nobody wants to read `width[0]`; pass an array if you
  need several, and read them individually.
- **SSR-safe by construction.** No effect runs on the server, so every field is `0` and
  `update()` is a no-op.
