# `useIntersectionObserver`

Detect changes to a target element's visibility.

> Ported from [`vueuse/core/useIntersectionObserver`](https://github.com/vueuse/vueuse/tree/main/packages/core/useIntersectionObserver).

## Signature

```ts
import { useIntersectionObserver } from '@wynn-dev/svelte-use';

const { isSupported, isActive, pause, resume, stop } = useIntersectionObserver(
	target,
	([entry]) => {
		console.log(entry.isIntersecting);
	},
	{ threshold: [0, 0.5, 1] }
);
```

Call it during component initialization — it uses `$effect`.

## Parameters

| Parameter  | Type                             | Description                                               |
| ---------- | -------------------------------- | --------------------------------------------------------- |
| `target`   | `MaybeElements`                  | Element, array of elements, or a getter returning either. |
| `callback` | `IntersectionObserverCallback`   | The platform callback, verbatim.                          |
| `options`  | `UseIntersectionObserverOptions` | `root`, `rootMargin`, `threshold`, `immediate`.           |

`target` may be a getter so observation follows a `bind:this` that resolves
later or a reactive list that changes. Nullish targets observe nothing;
repeated elements collapse to one observation.

### Options

| Option       | Type                                       | Default  | Description                                                  |
| ------------ | ------------------------------------------ | -------- | ------------------------------------------------------------ |
| `immediate`  | `boolean`                                  | `true`   | With `false`, observe nothing until `resume()`.              |
| `root`       | `MaybeGetter<Element \| Document \| null>` | viewport | Bounding box tested against. A `Document` is accepted as-is. |
| `rootMargin` | `MaybeGetter<string>`                      | `'0px'`  | Offsets added to the root's bounding box.                    |
| `threshold`  | `number \| number[]`                       | `0`      | Ratio, or ratios, between 0 and 1 at which to fire.          |

## Returns

| Field         | Type         | Reactivity                                                         |
| ------------- | ------------ | ------------------------------------------------------------------ |
| `isSupported` | `boolean`    | Plain value; `false` during SSR or without `IntersectionObserver`. |
| `isActive`    | `boolean`    | Getter-backed `$state`; flips when paused or resumed.              |
| `pause`       | `() => void` | Disconnect, keep the util usable.                                  |
| `resume`      | `() => void` | Start watching again. No-op after `stop()`.                        |
| `stop`        | `() => void` | Disconnect permanently.                                            |

## Examples

### Lazy-load an image when it scrolls into view

```svelte
<script lang="ts">
	import { useIntersectionObserver } from '@wynn-dev/svelte-use';

	let frame = $state<HTMLImageElement | undefined>();
	let visible = $state(false);

	useIntersectionObserver(
		frame,
		([entry]) => {
			visible = entry.isIntersecting;
		},
		{ threshold: 0.1 }
	);
</script>

{#if visible}
	<img {src} {alt} />
{:else}
	<img bind:this={frame} {alt} class="placeholder" />
{/if}
```

### Track against a scrolling container

```svelte
<script lang="ts">
	import { useIntersectionObserver } from '@wynn-dev/svelte-use';

	let scroller = $state<HTMLDivElement | undefined>();
	let rows = $state<HTMLDivElement[]>([]);
	let seen = $state<Set<number>>(new Set());

	useIntersectionObserver(
		() => rows,
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				seen = new Set(seen).add(rows.indexOf(entry.target as HTMLDivElement));
			}
		},
		{ root: () => scroller, rootMargin: '48px' }
	);
</script>

<div bind:this={scroller} style:overflow="auto; height: 20rem">
	{#each items as item, index (item.id)}
		<div bind:this={rows[index]}>{item.label}</div>
	{/each}
</div>
```

### Pause while a modal is open

```ts
const { isActive, pause, resume } = useIntersectionObserver(() => card, onIntersect);

$effect(() => {
	if (modalOpen) pause();
	else resume();
});
```

## Edge cases & cleanup

- The observer is created per `$effect` run and disconnected when that run is
  replaced, so a swapped target never leaves the old one watched.
- `pause()` tears the observer down; `resume()` builds a new one, which means a
  fresh baseline and no immediate replay of the entry you were paused on.
- `stop()` is permanent: `resume()` after it is a no-op.
- Changing `root` or `rootMargin` re-creates the observer, because both are only
  fixed at construction.
- No timers or listeners.

## Parity notes

- **`effect` instead of `watch`.** VueUse watches `[targets, root, rootMargin,
isActive]` with `flush: 'post'` and guards the whole watch behind
  `isSupported`. Here a single `$effect` reads the same values and takes the
  same guard, so an unsupported environment runs a no-op effect instead of a
  skipped watcher.
- **`isActive` is inline, not a `Pausable`.** VueUse builds `pause`/`resume`/
  `isActive` from its shared `Pausable` interface. This package ships no
  `usePausable` and it is not on the roadmap, so three lines of `$state` do the
  job. `resume()` is a no-op after `stop()` — VueUse's `resume` sets
  `isActive = true` unconditionally and relies on the watcher guard for the
  rest, which would silently re-arm a stopped observer.
- **No `ConfigurableWindow`.** There is no `window` option here; support is
  reported by `isSupported` and the guard lives in the effect.
- **`rootMargin` defaults to `'0px'`.** The platform defaults to `'0px'` too;
  it is passed explicitly because the init object is built in one place.
- **SSR-safe by construction.** `$effect` never runs on the server, so no
  observer is constructed and `isSupported` reports `false`.
