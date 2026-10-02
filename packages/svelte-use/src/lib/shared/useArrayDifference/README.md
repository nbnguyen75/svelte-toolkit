# `useArrayDifference`

Reactive difference of two arrays, with key, comparator, or symmetric mode. Ported from [VueUse `useArrayDifference`](https://vueuse.org/shared/useArrayDifference/).

## Signature

```ts
import { useArrayDifference } from '@wynn-dev/svelte-use';

const missing = useArrayDifference([1, 2, 3], [2]);
missing.value; // [1, 3]

useArrayDifference(rows, others, 'id').value; // compare by id
useArrayDifference(a, b, undefined, { symmetric: true }).value; // both sides
```

## Options

The third argument is an element `key` or a comparator; the fourth is options.

| Parameter        | Type                                    | Default    | Description                                   |
| ---------------- | --------------------------------------- | ---------- | --------------------------------------------- |
| `list`           | `MaybeGetter<readonly T[]>`             | (required) | Left array, or a getter over reactive state.  |
| `values`         | `MaybeGetter<readonly T[]>`             | (required) | Right array, or a getter over reactive state. |
| `keyOrCompareFn` | `keyof T \| (value, othVal) => boolean` | `===`      | Compare by one field, or with a predicate.    |
| `options`        | `UseArrayDifferenceOptions`             | —          | Extra configuration.                          |

`UseArrayDifferenceOptions`:

| Field       | Type      | Default | Description                                            |
| ----------- | --------- | ------- | ------------------------------------------------------ |
| `symmetric` | `boolean` | `false` | Also return the items of `values` missing from `list`. |

## Returns

| Field   | Type  | Reactive | Description                                              |
| ------- | ----- | -------- | -------------------------------------------------------- |
| `value` | `T[]` | getter   | Items of `list` absent from `values` (destructure-safe). |

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { useArrayDifference } from '@wynn-dev/svelte-use';

	let all = $state([1, 2, 3]);
	let done = $state([2]);
	const pending = useArrayDifference(
		() => all,
		() => done
	);
</script>

<p>Pending: {pending.value.join(', ')}</p>
```

### SSR behavior

Pure derived logic with no DOM access — safe during SSR.

## Edge cases & cleanup

- Lazy: the difference runs on read, not at construction.
- Every duplicate occurrence of a present item is removed.
- The default comparison is `===`, so objects match by identity; pass a `key`
  or a comparator for structural matching.
- With `symmetric`, the result is `list - values` followed by `values - list`.
- Both arrays keep their order; neither is mutated.
- No listeners, timers, or effects — nothing to dispose.

## VueUse parity notes

- `list` and `values` accept a plain array or a getter, matching this package's
  `MaybeGetter<T>` convention.
- Source: `vueuse/packages/shared/useArrayDifference/index.ts`.
