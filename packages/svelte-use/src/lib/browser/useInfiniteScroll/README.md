# `useInfiniteScroll`

Loads more content when a scroll container reaches one of its edges. Inspired by
[VueUse `useInfiniteScroll`](https://vueuse.org/core/useInfiniteScroll/).

## Signature

```ts
import { useInfiniteScroll } from '@wynn-dev/svelte-use';

const { isLoading, reset } = useInfiniteScroll(
	() => listEl,
	async (scroll) => {
		await loadPage(scroll.y);
	},
	{ distance: 200 }
);
```

## Options

Every [`useScroll`](../useScroll/README.md) option is accepted and forwarded.

| Option        | Type                                              | Default         | Description                                                           |
| ------------- | ------------------------------------------------- | --------------- | --------------------------------------------------------------------- |
| `distance`    | `number`                                          | `0`             | How far from the edge to start loading, as that edge's scroll offset. |
| `direction`   | `'top' \| 'right' \| 'bottom' \| 'left'`          | `'bottom'`      | Which edge to watch.                                                  |
| `interval`    | `number`                                          | `100`           | Minimum time between loads, in ms.                                    |
| `canLoadMore` | `(element: HTMLElement \| SVGElement) => boolean` | `() => true`    | Whether more content may load right now.                              |
| `onError`     | `(error: unknown) => void`                        | `console.error` | Called when `onLoadMore` rejects.                                     |

An explicit `offset[direction]` in the `useScroll` options wins over `distance`,
as it does upstream.

## Returns

| Field       | Type         | Reactive | Description                              |
| ----------- | ------------ | -------- | ---------------------------------------- |
| `isLoading` | `boolean`    | getter   | Whether a load is in flight.             |
| `reset`     | `() => void` | —        | Re-check the edge after the DOM settles. |

`onLoadMore` receives the `useScroll` return value, so a page number can be
derived from the scroll position without wiring two utils together by hand.

## Examples

### Infinite list

```svelte
<script lang="ts">
	import { useInfiniteScroll } from '@wynn-dev/svelte-use';

	let list = $state<HTMLDivElement>();
	let rows = $state<Item[]>([]);
	let page = $state(0);

	const { isLoading } = useInfiniteScroll(
		() => list,
		async () => {
			page += 1;
			rows = [...rows, ...(await loadPage(page))];
		},
		{ distance: 200 }
	);
</script>

<div bind:this={list} style:height="400px" style:overflow-y="auto">
	{#each rows as row (row.id)}<p>{row.label}</p>{/each}
	{#if isLoading}<p>loading…</p>{/if}
</div>
```

### Stop at the last page

```svelte
<script lang="ts">
	import { useInfiniteScroll } from '@wynn-dev/svelte-use';

	let list = $state<HTMLDivElement>();
	let hasMore = $state(true);

	const { isLoading } = useInfiniteScroll(() => list, loadNextPage, { canLoadMore: () => hasMore });
</script>
```

### Load upwards

```svelte
<script lang="ts">
	import { useInfiniteScroll } from '@wynn-dev/svelte-use';

	const { isLoading } = useInfiniteScroll(() => list, loadOlder, {
		direction: 'top',
		distance: 100
	});
</script>
```

### Re-check after a manual append

```svelte
<script lang="ts">
	import { useInfiniteScroll } from '@wynn-dev/svelte-use';

	const { reset } = useInfiniteScroll(() => list, loadNextPage);

	function prepend(item: Item) {
		rows = [item, ...rows];
		reset();
	}
</script>
```

## Edge cases & cleanup

- **The edge is re-checked after every load settles.** That is what fills a
  viewport whose first page is too short to scroll: each settled load looks
  again, and loading stops once there is room. A handler that leaves the
  container arrived keeps it loading.
- **`interval` is a floor, not an extra delay.** It runs _alongside_
  `onLoadMore`, so the real gap between loads is `max(onLoadMore, interval)`.
- **A rejected load still clears `isLoading` and re-checks**, so one failure
  cannot wedge the list. A synchronous throw is treated exactly like a rejected
  promise.
- **Nothing loads off the browser.** The target getter is not even called there,
  so `() => window` is safe in a component that renders on the server.
- **A `Window` or `Document` target is observed as `document.documentElement`**,
  because neither can be handed to an `IntersectionObserver`. `canLoadMore`
  receives that element.
- **An invisible container never loads**, whatever the scroll position says.
- **Content shorter than the viewport counts as arrived**, so the first page can
  grow instead of stalling forever with no edge to reach.
- **`reset()` waits a tick before checking**, so rows appended in the same
  handler are already measured.
- The `interval` timer is cleared on unmount, abandoning an in-flight load
  instead of resolving into a dead component.
- Built on `useScroll` and `useElementVisibility`, so it adds no observer of its
  own and inherits their cleanup.
- Must be called in component initialization (uses `$state` / `$effect`).

## Parity notes

- **`interval` and `onError` are kept; `controls` and `scheduler` are not.** The
  upstream `v-on-infinite-scroll` directive plumbing has no Svelte equivalent
  worth carrying, and `onLoadMore` already resolves when the load is done.
- **`useInfiniteScroll` gained `reset()`** so a caller that appends rows outside
  the load handler can still trigger a check without faking a scroll event.
- **The `directive` build is not ported.** Svelte has no directive equivalent,
  and the function form is the idiomatic shape here.
