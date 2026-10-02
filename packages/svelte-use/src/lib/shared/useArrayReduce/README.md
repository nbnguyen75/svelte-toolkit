# `useArrayReduce`

Reactive `Array.reduce`, with or without an initial value. Ported from [VueUse `useArrayReduce`](https://vueuse.org/shared/useArrayReduce/).

## Signature

```ts
import { useArrayReduce } from '@wynn-dev/svelte-use';

useArrayReduce([1, 2, 3], (sum, n) => sum + n).value; // 6
useArrayReduce([1, 2, 3], (sum, n) => sum + n, 100).value; // 106
```

## Options

| Parameter      | Type                                   | Default    | Description                                |
| -------------- | -------------------------------------- | ---------- | ------------------------------------------ |
| `list`         | `MaybeGetter<readonly T[]>`            | (required) | Array, or a getter over reactive state.    |
| `reducer`      | `(previous, current, index) => result` | (required) | Reduction step.                            |
| `initialValue` | `MaybeGetter<U>`                       | —          | Seed. Omit to seed with the first element. |

## Returns

| Field   | Type | Reactive | Description                          |
| ------- | ---- | -------- | ------------------------------------ |
| `value` | `U`  | getter   | Reduction result (destructure-safe). |

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { useArrayReduce } from '@wynn-dev/svelte-use';

	let lines = $state([{ total: 10 }, { total: 20 }]);
	const grand = useArrayReduce(
		() => lines,
		(sum, line) => sum + line.total,
		0
	);
</script>

<p>Total: {grand.value}</p>
```

### Reducing into another type

```ts
const digits = useArrayReduce([1, 2, 3], (acc: string, n) => `${acc}${n}`, '');
digits.value; // '123'
```

### SSR behavior

Pure derived logic with no DOM access — safe during SSR.

## Edge cases & cleanup

- Lazy: the reduction runs on read, not at construction.
- Without an initial value the first element seeds the accumulator and indices
  start at `1`; with one, indices start at `0`.
- Without an initial value an empty list throws `TypeError`, matching native
  `reduce`. With one, an empty list returns the seed.
- A function seed is treated as a getter (the `MaybeGetter<T>` convention).
- `0`, `''`, and `false` count as "provided" — only `undefined` falls through
  to the no-seed path.
- No listeners, timers, or effects — nothing to dispose.

## VueUse parity notes

- `list` and `initialValue` accept a plain value or a getter, matching this
  package's `MaybeGetter<T>` convention.
- Source: `vueuse/packages/shared/useArrayReduce/index.ts`.
