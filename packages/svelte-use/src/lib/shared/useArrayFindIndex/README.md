# `useArrayFindIndex`

Reactive `Array.findIndex`. Ported from [VueUse `useArrayFindIndex`](https://vueuse.org/shared/useArrayFindIndex/).

## Signature

```ts
import { useArrayFindIndex } from '@wynn-dev/svelte-use';

const index = useArrayFindIndex([1, 3, 4], (n) => n % 2 === 0);
index.value; // 2
```

## Options

| Parameter | Type                                 | Default    | Description                                           |
| --------- | ------------------------------------ | ---------- | ----------------------------------------------------- |
| `list`    | `MaybeGetter<readonly T[]>`          | (required) | Array, or a getter over reactive state.               |
| `fn`      | `(element, index, array) => unknown` | (required) | Predicate invoked per element, with native arguments. |

Any truthy return short-circuits, exactly like native `findIndex`.

## Returns

| Field   | Type     | Reactive | Description                                       |
| ------- | -------- | -------- | ------------------------------------------------- |
| `value` | `number` | getter   | First matching index, or `-1` (destructure-safe). |

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { useArrayFindIndex } from '@wynn-dev/svelte-use';

	let steps = $state(['a', 'b', 'c']);
	const at = useArrayFindIndex(
		() => steps,
		(step) => step === 'c'
	);
</script>

<p>{at.value === -1 ? 'missing' : `step ${at.value + 1}`}</p>
```

### SSR behavior

Pure derived logic with no DOM access — safe during SSR.

## Edge cases & cleanup

- Lazy: the predicate runs on read, not at construction.
- No match, or an empty list, yields `-1`.
- No listeners, timers, or effects — nothing to dispose.

## VueUse parity notes

- `list` accepts a plain array or a getter, matching this package's
  `MaybeGetter<T>` convention.
- Source: `vueuse/packages/shared/useArrayFindIndex/index.ts`.
