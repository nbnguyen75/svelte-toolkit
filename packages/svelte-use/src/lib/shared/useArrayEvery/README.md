# `useArrayEvery`

Reactive `Array.every`. Ported from [VueUse `useArrayEvery`](https://vueuse.org/shared/useArrayEvery/).

## Signature

```ts
import { useArrayEvery } from '@wynn-dev/svelte-use';

const all = useArrayEvery([2, 4], (n) => n % 2 === 0);
all.value; // true
```

## Options

| Parameter | Type                                 | Default    | Description                                           |
| --------- | ------------------------------------ | ---------- | ----------------------------------------------------- |
| `list`    | `MaybeGetter<readonly T[]>`          | (required) | Array, or a getter over reactive state.               |
| `fn`      | `(element, index, array) => unknown` | (required) | Predicate invoked per element, with native arguments. |

Any falsy return short-circuits, exactly like native `every`.

## Returns

| Field   | Type      | Reactive | Description                                          |
| ------- | --------- | -------- | ---------------------------------------------------- |
| `value` | `boolean` | getter   | `true` when every element passes (destructure-safe). |

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { useArrayEvery } from '@wynn-dev/svelte-use';

	let fields = $state([{ valid: true }, { valid: true }]);
	const isValid = useArrayEvery(
		() => fields,
		(field) => field.valid
	);
</script>

<button disabled={!isValid.value}>Submit</button>
```

### SSR behavior

Pure derived logic with no DOM access — safe during SSR.

## Edge cases & cleanup

- Lazy: the predicate runs on read, not at construction.
- An empty list is `true`, matching native `every`.
- No listeners, timers, or effects — nothing to dispose.

## VueUse parity notes

- `list` accepts a plain array or a getter, matching this package's
  `MaybeGetter<T>` convention.
- Source: `vueuse/packages/shared/useArrayEvery/index.ts`.
