# `useArrayFilter`

Reactive `Array.filter`. Ported from [VueUse `useArrayFilter`](https://vueuse.org/shared/useArrayFilter/).

## Signature

```ts
import { useArrayFilter } from '@wynn-dev/svelte-use';

const evens = useArrayFilter([1, 2, 3, 4], (n) => n % 2 === 0);
evens.value; // [2, 4]
```

## Options

| Parameter | Type                                 | Default    | Description                                           |
| --------- | ------------------------------------ | ---------- | ----------------------------------------------------- |
| `list`    | `MaybeGetter<readonly T[]>`          | (required) | Array, or a getter over reactive state.               |
| `fn`      | `(element, index, array) => unknown` | (required) | Predicate invoked per element, with native arguments. |

Any truthy return keeps the element, exactly like native `filter`.

## Returns

| Field   | Type  | Reactive | Description                            |
| ------- | ----- | -------- | -------------------------------------- |
| `value` | `T[]` | getter   | New filtered array (destructure-safe). |

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { useArrayFilter } from '@wynn-dev/svelte-use';

	let tasks = $state([{ done: true }, { done: false }]);
	const open = useArrayFilter(
		() => tasks,
		(task) => !task.done
	);
</script>

<p>{open.value.length} open</p>
```

### SSR behavior

Pure derived logic with no DOM access — safe during SSR.

## Edge cases & cleanup

- Lazy: the predicate runs on read, not at construction.
- Returns a new array; the source is never mutated.
- No listeners, timers, or effects — nothing to dispose.

## VueUse parity notes

- `list` accepts a plain array or a getter, matching this package's
  `MaybeGetter<T>` convention.
- Source: `vueuse/packages/shared/useArrayFilter/index.ts`.
