# `useElementVisibility`

Track whether an element is inside its viewport.

> Ported from [`vueuse/core/useElementVisibility`](https://github.com/vueuse/vueuse/tree/main/packages/core/useElementVisibility).

## Signature

```ts
import { useElementVisibility } from '@wynn-dev/svelte-use';

const { isVisible, stop } = useElementVisibility(() => card, {
	scrollTarget: () => scroller,
	threshold: 0.1,
	once: true
});
```

Call it during component initialization — it uses `$effect` through
`useIntersectionObserver`, so a `bind:this` that resolves later is picked up.

## Parameters

| Parameter | Type                          | Description                           |
| --------- | ----------------------------- | ------------------------------------- |
| `element` | `MaybeGetter<MaybeElement>`   | Element to watch, or a getter for it. |
| `options` | `UseElementVisibilityOptions` | See below.                            |

### Options

| Option         | Type                                       | Default  | Description                                                    |
| -------------- | ------------------------------------------ | -------- | -------------------------------------------------------------- |
| `initialValue` | `boolean`                                  | `false`  | What is reported before the first intersection report arrives. |
| `scrollTarget` | `MaybeGetter<Element \| Document \| null>` | viewport | Viewport to test against, for visibility inside a scroll box.  |
| `rootMargin`   | `MaybeGetter<string>`                      | `'0px'`  | Offsets added to the root's bounding box.                      |
| `threshold`    | `number \| number[]`                       | `0`      | Ratio, or ratios, at which visibility is re-evaluated.         |
| `once`         | `boolean`                                  | `false`  | Stop observing after visibility changes for the first time.    |

## Returns

| Field       | Type         | Reactivity                                                          |
| ----------- | ------------ | ------------------------------------------------------------------- |
| `isVisible` | `boolean`    | Getter-backed `$state`; reading it in an effect or template tracks. |
| `stop`      | `() => void` | Stop observing. Idempotent.                                         |

## Examples

### Lazy-load an image

```svelte
<script lang="ts">
	import { useElementVisibility } from '@wynn-dev/svelte-use';

	let frame = $state<HTMLImageElement>();
	const { isVisible } = useElementVisibility(() => frame);
</script>

{#if isVisible}
	<img {src} {alt} />
{:else}
	<img bind:this={frame} {alt} class="placeholder" />
{/if}
```

### Load a script once, when it first scrolls into view

```svelte
<script lang="ts">
	import { useElementVisibility, useScriptTag } from '@wynn-dev/svelte-use';

	let holder = $state<HTMLDivElement>();
	const { isVisible } = useElementVisibility(() => holder, { once: true });

	const script = $derived(isVisible ? useScriptTag({ src }) : undefined);
</script>

<div bind:this={holder}>
	{#if script}loaded{/if}
</div>
```

### Visible inside a scroll container

```svelte
<script lang="ts">
	import { useElementVisibility } from '@wynn-dev/svelte-use';

	let scroller = $state<HTMLDivElement>();
	let row = $state<HTMLDivElement>();
	const { isVisible } = useElementVisibility(() => row, { scrollTarget: () => scroller });
</script>

<div bind:this={scroller} style:overflow="auto; height: 20rem">
	<div style="height: 40rem"></div>
	<div bind:this={row}>tracked row</div>
</div>

{#if isVisible}in view{/if}
```

## Edge cases & cleanup

- The observer is created per `$effect` run and disconnected when that run is
  replaced or the component unmounts.
- **`once` does not spend itself on the first report.** `IntersectionObserver`
  always reports once on `observe()`, and for a below-the-fold element that
  report says "not visible". Only an actual _change_ consumes `once`, so an
  element that starts off-screen still runs until it is seen once.
- **Entries in one delivery can disagree** when the element crossed a threshold
  mid-batch. The latest entry by `time` wins, not the last one in the array.
- Changing `scrollTarget` or `rootMargin` re-creates the observer, because both
  are fixed at construction.
- No timers or listeners.

## Parity notes

- **`once` is fixed.** VueUse registers a `watchOnce` _inside_ the observer
  callback, after it has already assigned `isVisible`. A `watch` registered at
  that point fires on the _next_ change, so `once: true` there stops after the
  second report — one more than its own docstring promises, and one more than
  is useful for "run this the first time the element is seen". It is untested
  upstream. This implementation compares against the previous value and stops
  on the first change, which is what the option name and docstring say.
- **One return shape, no `controls` flag.** VueUse returns a bare
  `ShallowRef<boolean>` by default and an observer controller plus `isVisible`
  under `controls: true` — two shapes and two overloads for one flag. Here
  `stop` is always returned, which is the control that matters for this util
  (it is also what `once` needs internally), so there is nothing left to gate.
- **`isVisible` is a getter, not a ref.** A bare `ShallowRef` would make every
  caller write `.value`, which reads wrong in Svelte; the package convention is
  a getter property, which also survives destructuring.
- **Single element, not an array.** `useIntersectionObserver` accepts arrays,
  but "visible" for a set of elements has no meaning VueUse defines — any or
  all? — so this util keeps the single-target signature rather than inventing
  one.
- **`scrollTarget` keeps VueUse's name** rather than being renamed to `root`,
  so the option is recognisable and the two utils stay comparable.
- **SSR-safe by construction.** No effect runs on the server, so `isVisible` is
  the initial value and nothing is observed.
