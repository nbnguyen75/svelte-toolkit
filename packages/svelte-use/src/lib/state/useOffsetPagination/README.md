# `useOffsetPagination`

Offset-based pagination state with clamped page navigation. Inspired by [VueUse `useOffsetPagination`](https://vueuse.org/core/useOffsetPagination/).

## Signature

```ts
import { useOffsetPagination } from '@wynn-dev/svelte-use';

const pages = useOffsetPagination({ total: 95 });
```

## Parameters

| Parameter | Type                         | Default | Description |
| --------- | ---------------------------- | ------- | ----------- |
| `options` | `UseOffsetPaginationOptions` | `{}`    | See below.  |

| Option              | Type                  | Default | Description                                            |
| ------------------- | --------------------- | ------- | ------------------------------------------------------ |
| `total`             | `MaybeGetter<number>` | —       | Total items. Omit for an unbounded (infinite) listing. |
| `pageSize`          | `MaybeGetter<number>` | `10`    | Items per page, clamped to `>= 1`.                     |
| `page`              | `MaybeGetter<number>` | `1`     | Initial page, clamped to `[1, pageCount]`.             |
| `onPageChange`      | `(state) => void`     | —       | Called whenever the page changes.                      |
| `onPageSizeChange`  | `(state) => void`     | —       | Called whenever the page size changes.                 |
| `onPageCountChange` | `(state) => void`     | —       | Called whenever the page count changes.                |

## Returns

| Field             | Type         | Description                                               |
| ----------------- | ------------ | --------------------------------------------------------- |
| `currentPage`     | `number`     | Current page, clamped to `[1, pageCount]`. Getter/setter. |
| `currentPageSize` | `number`     | Items per page, clamped to `>= 1`. Getter/setter.         |
| `pageCount`       | `number`     | Total pages, or `Infinity` when unbounded. Getter-backed. |
| `isFirstPage`     | `boolean`    | Whether this is the first page. Getter-backed.            |
| `isLastPage`      | `boolean`    | Whether this is the last page. Getter-backed.             |
| `next`            | `() => void` | Go forward one page (clamped).                            |
| `prev`            | `() => void` | Go back one page (clamped).                               |

Change callbacks fire for **every** mutation path — `next`, `prev`, and the
`currentPage` setter — including clamped writes. They never fire during
construction.

When `total` is omitted the overload returns `UseOffsetPaginationInfinityReturn`,
which omits `isLastPage` because an unbounded list has no last page.

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { useOffsetPagination } from '@wynn-dev/svelte-use';

	const pages = useOffsetPagination({ total: 95 });
</script>

<p>Page {pages.currentPage} of {pages.pageCount}</p>
<button onclick={() => pages.prev()} disabled={pages.isFirstPage}>Previous</button>
<button onclick={() => pages.next()} disabled={pages.isLastPage}>Next</button>
```

### Reacting to a changing total

```svelte
<script lang="ts">
	import { useOffsetPagination } from '@wynn-dev/svelte-use';

	let rows = $state<Row[]>([]);
	const pages = useOffsetPagination({
		total: () => rows.length,
		pageSize: () => 25,
		onPageCountChange: (state) => console.log('pages:', state.pageCount)
	});
</script>
```

### Infinite listing

```svelte
<script lang="ts">
	import { useOffsetPagination } from '@wynn-dev/svelte-use';

	// No `total`: pageCount is Infinity, so there is no `isLastPage`.
	const feed = useOffsetPagination({ pageSize: 20 });
</script>

<p>Loaded {feed.currentPage * feed.currentPageSize} items</p>
<button onclick={() => feed.next()}>Load more</button>
```

## SSR

Safe to construct on the server: no browser API. `$derived` works server-side, so
`pageCount` / `isFirstPage` are correct on first render; the change-callback
`$effect`s are inert there, so they never fire during SSR.
