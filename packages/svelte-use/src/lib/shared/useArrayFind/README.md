# `useArrayFind`

Reactive `Array.find`. Ported from [VueUse `useArrayFind`](https://vueuse.org/shared/useArrayFind/).

## Signature

```ts
import { useArrayFind } from '@wynn-dev/svelte-use';

const match = useArrayFind([1, 2, 3], (n) => n > 1);
match.value; // 2
```

## Options

| Parameter | Type                                 | Default    | Description                                           |
| --------- | ------------------------------------ | ---------- | ----------------------------------------------------- |
| `list`    | `MaybeGetter<readonly T[]>`          | (required) | Array, or a getter over reactive state.               |
| `fn`      | `(element, index, array) => unknown` | (required) | Predicate invoked per element, with native arguments. |

Any truthy return short-circuits, exactly like native `find`.

## Returns

| Field   | Type             | Reactive | Description                                     |
| ------- | ---------------- | -------- | ----------------------------------------------- |
| `value` | `T \| undefined` | getter   | First match, or `undefined` (destructure-safe). |

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { useArrayFind } from '@wynn-dev/svelte-use';

	let users = $state([{ id: 1 }, { id: 2 }]);
	const second = useArrayFind(
		() => users,
		(user) => user.id === 2
	);
</script>

<p>{second.value?.id ?? 'nobody'}</p>
```

### SSR behavior

Pure derived logic with no DOM access — safe during SSR.

## Edge cases & cleanup

- Lazy: the predicate runs on read, not at construction.
- No match, or an empty list, yields `undefined`.
- The found element keeps its reference identity.
- No listeners, timers, or effects — nothing to dispose.

## VueUse parity notes

- `list` accepts a plain array or a getter, matching this package's
  `MaybeGetter<T>` convention.
- Source: `vueuse/packages/shared/useArrayFind/index.ts`.
