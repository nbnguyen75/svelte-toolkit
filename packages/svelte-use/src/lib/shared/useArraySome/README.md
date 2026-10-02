# `useArraySome`

Reactive `Array.some`. Ported from [VueUse `useArraySome`](https://vueuse.org/shared/useArraySome/).

## Signature

```ts
import { useArraySome } from '@wynn-dev/svelte-use';

const any = useArraySome([1, 2, 3], (n) => n > 2);
any.value; // true
```

## Options

| Parameter | Type                                 | Default    | Description                                           |
| --------- | ------------------------------------ | ---------- | ----------------------------------------------------- |
| `list`    | `MaybeGetter<readonly T[]>`          | (required) | Array, or a getter over reactive state.               |
| `fn`      | `(element, index, array) => unknown` | (required) | Predicate invoked per element, with native arguments. |

Any truthy return short-circuits, exactly like native `some`.

## Returns

| Field   | Type      | Reactive | Description                                        |
| ------- | --------- | -------- | -------------------------------------------------- |
| `value` | `boolean` | getter   | `true` when any element passes (destructure-safe). |

## Examples

### Basic usage

```svelte
<script lang="ts">
	import { useArraySome } from '@wynn-dev/svelte-use';

	let members = $state([{ role: 'user' }]);
	const hasAdmin = useArraySome(
		() => members,
		(member) => member.role === 'admin'
	);
</script>

<p>{hasAdmin.value ? 'Admin present' : 'No admins'}</p>
```

### SSR behavior

Pure derived logic with no DOM access — safe during SSR.

## Edge cases & cleanup

- Lazy: the predicate runs on read, not at construction.
- An empty list is `false`, matching native `some`.
- No listeners, timers, or effects — nothing to dispose.

## VueUse parity notes

- `list` accepts a plain array or a getter, matching this package's
  `MaybeGetter<T>` convention.
- Source: `vueuse/packages/shared/useArraySome/index.ts`.
