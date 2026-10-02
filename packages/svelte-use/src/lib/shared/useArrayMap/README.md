# `useArrayMap`

Reactive `Array.map`. Ported from [VueUse `useArrayMap`](https://vueuse.org/shared/useArrayMap/).

## Signature

```ts
import { useArrayMap } from '@wynn-dev/svelte-use';

const doubled = useArrayMap([1, 2, 3], (n) => n * 2);
doubled.value; // [2, 4, 6]
```

## Options

| Parameter | Type                           | Default    | Description                                         |
| --------- | ------------------------------ | ---------- | --------------------------------------------------- |
| `list`    | `MaybeGetter<readonly T[]>`    | (required) | Array, or a getter over reactive state.             |
| `fn`      | `(element, index, array) => U` | (required) | Mapping invoked per element, with native arguments. |

The element type may change: `useArrayMap(['ab'], (s) => s.length).value` is
`number[]`.

## Returns

| Field   | Type  | Reactive | Description                          |
| ------- | ----- | -------- | ------------------------------------ |
| `value` | `U[]` | getter   | New mapped array (destructure-safe). |

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { useArrayMap } from '@wynn-dev/svelte-use';

	let todos = $state([{ done: false, label: 'write' }]);
	const labels = useArrayMap(
		() => todos,
		(todo) => todo.label
	);
</script>

<ul>
	{#each labels.value as label (label)}
		<li>{label}</li>
	{/each}
</ul>
```

### SSR behavior

Pure derived logic with no DOM access — safe during SSR.

## Edge cases & cleanup

- Lazy: the mapper runs on read, not at construction.
- Returns a new array; the source is never mutated.
- No listeners, timers, or effects — nothing to dispose.

## VueUse parity notes

- `list` accepts a plain array or a getter, matching this package's
  `MaybeGetter<T>` convention.
- Source: `vueuse/packages/shared/useArrayMap/index.ts`.
