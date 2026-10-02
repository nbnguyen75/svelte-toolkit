# `computedWithControl`

Derived value with an explicit source and a manual refresh trigger. Inspired by
[VueUse `computedWithControl`](https://vueuse.org/shared/computedWithControl/).

The result is memoized per revision: it recomputes when `source` changes or when
`trigger()` is called, and not merely because it was read. Reads inside `fn` run
untracked, so only `source` decides when to recompute.

## Signature

```ts
import { computedWithControl } from '@wynn-dev/svelte-use';

const total = computedWithControl(
	() => items,
	() => items.reduce((sum, item) => sum + item.price, 0)
);

total.value; // recomputes when `items` changes
total.trigger(); // force a refresh
```

## Parameters

| Parameter | Type                                                 | Default | Description                                             |
| --------- | ---------------------------------------------------- | ------- | ------------------------------------------------------- |
| `source`  | `MaybeGetter<unknown>`                               | -       | Reactive source that drives recomputation.              |
| `fn`      | `() => T` \| `{ get: () => T; set: (v: T) => void }` | -       | Derivation, or a `get`/`set` pair for a writable value. |

## Returns

| Field     | Type         | Description                                          |
| --------- | ------------ | ---------------------------------------------------- |
| `value`   | `T`          | Memoized value. Read-only, or writable with a `set`. |
| `trigger` | `() => void` | Force recomputation on the next read.                |

## Notes

- Must be called during component initialization (it registers an `$effect`).
- A `T` of `undefined` is cached correctly — the cache is keyed by revision, not
  by a truthiness check.
- Writes on the writable overload call `set` immediately; the memoized value
  refreshes on the next recomputation.

## Example

```svelte
<script lang="ts">
	import { computedWithControl } from '@wynn-dev/svelte-use';

	let query = $state('');
	let results = $state<string[]>([]);

	const visible = computedWithControl(
		() => query,
		() => results.filter((item) => item.includes(query)).slice(0, 5)
	);
</script>

<input bind:value={query} />
<ul>
	{#each visible.value as item (item)}
		<li>{item}</li>
	{/each}
</ul>
```
