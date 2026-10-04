# `useResizeObserver`

Report changes to the dimensions of an element's content or border box.

> Ported from [`vueuse/core/useResizeObserver`](https://github.com/vueuse/vueuse/tree/main/packages/core/useResizeObserver).

## Signature

```ts
import { useResizeObserver } from '@wynn-dev/svelte-use';

const { isSupported, stop } = useResizeObserver(
	target,
	([entry]) => {
		console.log(entry.contentRect.width, entry.contentRect.height);
	},
	{ box: 'border-box' }
);
```

Call it during component initialization — it uses `$effect`.

## Parameters

| Parameter  | Type                       | Description                                               |
| ---------- | -------------------------- | --------------------------------------------------------- |
| `target`   | `MaybeElements`            | Element, array of elements, or a getter returning either. |
| `callback` | `ResizeObserverCallback`   | The platform callback, verbatim.                          |
| `options`  | `UseResizeObserverOptions` | Native `ResizeObserverOptions`. Defaults to `{}`.         |

`target` may be a getter so observation follows a `bind:this` that resolves
later or a reactive list that changes. Nullish targets observe nothing;
repeated elements collapse to one observation.

## Returns

| Field         | Type         | Reactivity                                                   |
| ------------- | ------------ | ------------------------------------------------------------ |
| `isSupported` | `boolean`    | Plain value; `false` during SSR or without `ResizeObserver`. |
| `stop`        | `() => void` | Disconnects and stops re-observing on a target change.       |

## Examples

### Keep a box square to its width

```svelte
<script lang="ts">
	import { useResizeObserver } from '@wynn-dev/svelte-use';

	let tile = $state<HTMLDivElement | undefined>();
	let size = $state(0);

	useResizeObserver(tile, ([entry]) => {
		size = entry.contentRect.width;
	});
</script>

<div bind:this={tile} style:height="{size}px">width {Math.round(size)}px</div>
```

### Watch several elements

```svelte
<script lang="ts">
	import { useResizeObserver } from '@wynn-dev/svelte-use';

	let cards = $state<HTMLDivElement[]>([]);
	const widths = $state<number[]>([]);

	useResizeObserver(
		() => cards,
		(entries) => {
			for (const entry of entries) widths = [...widths, entry.contentRect.width];
		}
	);
</script>

{#each items as item (item.id)}
	<div bind:this={cards[index]}>{item.label}</div>
{/each}
```

### Stop observing early

```ts
const { stop } = useResizeObserver(() => panel, onResize);
// no longer interested, but the element keeps rendering
stop();
```

## Edge cases & cleanup

- The observer is created per `$effect` run and disconnected when that run is
  replaced, so a swapped target never leaves the old one watched.
- `stop()` is idempotent and also prevents re-observation if the target changes
  afterwards.
- **The callback can loop.** Writing the element's size inside the callback
  reports that write on the next frame. Compare against the previous value and
  return early — `useTextareaAutosize` does exactly this for width, and the
  comment in its source says why.
- Each util call owns its own observer. Two utils watching one element means two
  callbacks, which is what you asked for.
- No timers or listeners.

## Parity notes

- **`effect` instead of `watch`.** VueUse watches a computed list of targets with
  `flush: 'post'`. A single `$effect` reading the getter gives the same
  re-observe-on-change behaviour without the extra computed layer.
- **No deprecated local types.** VueUse exports its own `ResizeObserverEntry`,
  `ResizeObserverSize` and `ResizeObserverCallback` as deprecated aliases. They
  are in the DOM lib now, and the callback is passed through untouched, so this
  package uses the global types instead.
- **No `instanceof Element` filter.** VueUse drops targets that fail
  `instanceof Element`; that would reject text nodes and depends on a global
  constructor check, so the platform reports a bad target instead.
- **SSR-safe by construction.** `$effect` never runs on the server, so no
  observer is constructed and `isSupported` reports `false`.
