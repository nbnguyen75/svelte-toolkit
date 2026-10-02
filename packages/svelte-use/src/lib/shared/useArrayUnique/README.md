# `useArrayUnique`

Reactive deduplication. Ported from [VueUse `useArrayUnique`](https://vueuse.org/shared/useArrayUnique/).

## Signature

```ts
import { useArrayUnique } from '@wynn-dev/svelte-use';

const unique = useArrayUnique([1, 2, 1]);
unique.value; // [1, 2]
```

## Options

| Parameter   | Type                        | Default         | Description                                                   |
| ----------- | --------------------------- | --------------- | ------------------------------------------------------------- |
| `list`      | `MaybeGetter<readonly T[]>` | (required)      | Array, or a getter over reactive state.                       |
| `compareFn` | `(a, b, array) => boolean`  | `Set` semantics | Custom duplicate test; return `true` when `a` duplicates `b`. |

## Returns

| Field   | Type  | Reactive | Description                            |
| ------- | ----- | -------- | -------------------------------------- |
| `value` | `T[]` | getter   | Deduplicated array (destructure-safe). |

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { useArrayUnique } from '@wynn-dev/svelte-use';

	let tags = $state(['vue', 'svelte', 'vue']);
	const tags_ = useArrayUnique(() => tags);
</script>

<p>{tags_.value.join(', ')}</p>
```

### Comparing by a field

```ts
const rows = [{ id: 1 }, { id: 1 }, { id: 2 }];
const byId = useArrayUnique(rows, (a, b) => a.id === b.id);
byId.value; // [{ id: 1 }, { id: 2 }]
```

### SSR behavior

Pure derived logic with no DOM access — safe during SSR.

## Edge cases & cleanup

- Lazy: the deduplication runs on read, not at construction.
- First occurrences win; input order is preserved.
- Returns a new array; the source is never mutated.
- No listeners, timers, or effects — nothing to dispose.

## VueUse parity notes

- The default comparison is `Set` semantics (`SameValueZero`), so `NaN`
  deduplicates against itself and `0` against `-0`. A custom `compareFn` is
  `O(n²)`; the default uses a `Set` in one pass.
- `list` accepts a plain array or a getter, matching this package's
  `MaybeGetter<T>` convention.
- Source: `vueuse/packages/shared/useArrayUnique/index.ts`.
