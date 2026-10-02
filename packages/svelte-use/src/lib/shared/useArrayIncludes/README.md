# `useArrayIncludes`

Reactive membership check with a comparator, an element key, or a `fromIndex` offset. Ported from [VueUse `useArrayIncludes`](https://vueuse.org/shared/useArrayIncludes/).

## Signature

```ts
import { useArrayIncludes } from '@wynn-dev/svelte-use';

const known = useArrayIncludes([1, 2, 3], 2);
known.value; // true

useArrayIncludes(users, 2, 'id').value; // users contains id 2
useArrayIncludes(ids, 2, { fromIndex: 2 }).value; // honour a start offset
```

## Options

The third argument is one of a comparator function, an element `key`, or an
options object.

| Parameter    | Type                                             | Default         | Description                              |
| ------------ | ------------------------------------------------ | --------------- | ---------------------------------------- |
| `list`       | `MaybeGetter<readonly T[]>`                      | (required)      | Array, or a getter over reactive state.  |
| `value`      | `MaybeGetter<V>`                                 | (required)      | Needle, or a getter over reactive state. |
| `comparator` | `fn \| keyof T \| UseArrayIncludesOptions<T, V>` | strict equality | Custom comparison.                       |

`UseArrayIncludesOptions<T, V>`:

| Field        | Type            | Default         | Description                    |
| ------------ | --------------- | --------------- | ------------------------------ |
| `comparator` | `fn \| keyof T` | strict equality | Custom comparison.             |
| `fromIndex`  | `number`        | `0`             | Start searching at this index. |

The comparator receives `(element, value, index, array)` — the sliced tail for
`index` and `array`.

## Returns

| Field   | Type      | Reactive | Description                                     |
| ------- | --------- | -------- | ----------------------------------------------- |
| `value` | `boolean` | getter   | Whether the value was found (destructure-safe). |

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { useArrayIncludes } from '@wynn-dev/svelte-use';

	let picked = $state(['vue']);
	const hasSvelte = useArrayIncludes(() => picked, 'svelte');
</script>

<input type="checkbox" checked={hasSvelte.value} />
```

### SSR behavior

Pure derived logic with no DOM access — safe during SSR.

## Edge cases & cleanup

- Lazy: the search runs on read, not at construction.
- The default comparison is `SameValueZero`, so `NaN` matches itself and `0`
  matches `-0`, like native `includes`. Key comparisons use `Object.is`.
- `fromIndex` beyond the end yields `false`.
- No listeners, timers, or effects — nothing to dispose.

## VueUse parity notes

- `list` and `value` accept a plain value or a getter, matching this package's
  `MaybeGetter<T>` convention.
- Source: `vueuse/packages/shared/useArrayIncludes/index.ts`.
