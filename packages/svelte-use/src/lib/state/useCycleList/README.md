# `useCycleList`

Cycle through a list with wraparound. Inspired by [VueUse `useCycleList`](https://vueuse.org/shared/useCycleList/).

## Signature

```ts
import { useCycleList } from '@wynn-dev/svelte-use';

const theme = useCycleList(['light', 'dark', 'system']);
```

## Parameters

| Parameter | Type                     | Default | Description                                           |
| --------- | ------------------------ | ------- | ----------------------------------------------------- |
| `list`    | `MaybeGetter<T[]>`       | —       | Items: a plain array or a getter over reactive state. |
| `options` | `UseCycleListOptions<T>` | `{}`    | See below.                                            |

| Option          | Type                              | Default               | Description                                           |
| --------------- | --------------------------------- | --------------------- | ----------------------------------------------------- |
| `initialValue`  | `MaybeGetter<T>`                  | first list item       | Starting item.                                        |
| `fallbackIndex` | `number`                          | `0`                   | Index used when the current value is not in the list. |
| `getIndexOf`    | `(value: T, list: T[]) => number` | `list.indexOf(value)` | Custom index lookup (useful for object identity).     |

## Returns

| Field   | Type                | Description                                             |
| ------- | ------------------- | ------------------------------------------------------- |
| `value` | `T`                 | Current item. Getter/setter-backed (destructure-safe).  |
| `index` | `number`            | Index of the current item, or `-1` for an empty list.   |
| `next`  | `(n?: number) => T` | Move forward `n` places (default `1`) with wraparound.  |
| `prev`  | `(n?: number) => T` | Move backward `n` places (default `1`) with wraparound. |
| `go`    | `(i: number) => T`  | Jump to index `i`, wrapping out-of-range indices.       |

The navigation methods return the new item. Replacing the whole list re-anchors
the current item onto the new contents.

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { useCycleList } from '@wynn-dev/svelte-use';

	const theme = useCycleList(['light', 'dark', 'system']);
</script>

<button onclick={() => theme.prev()}>◀</button>
<span>{theme.value}</span>
<button onclick={() => theme.next()}>▶</button>
```

### Stepping several places

```svelte
<script lang="ts">
	import { useCycleList } from '@wynn-dev/svelte-use';

	const year = useCycleList([2023, 2024, 2025, 2026]);
</script>

<button onclick={() => year.next(2)}>+2</button><p>{year.value}</p>
```

### Objects with a custom lookup

```svelte
<script lang="ts">
	import { useCycleList } from '@wynn-dev/svelte-use';

	const format = useCycleList(
		[
			{ id: 'json', label: 'JSON' },
			{ id: 'yaml', label: 'YAML' }
		],
		{ getIndexOf: (value, list) => list.findIndex((item) => item.id === value.id) }
	);
</script>

<button onclick={() => format.next()}>{format.value.label}</button>
```

## SSR

Safe to construct on the server: no browser API. `$derived` works server-side, so
`value` / `index` / `next()` are correct; only the list-replacement `$effect` is
inert.
