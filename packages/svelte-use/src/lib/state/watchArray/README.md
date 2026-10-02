# `watchArray`

Watches an array source and reports which items were added and removed.
Inspired by [VueUse `watchArray`](https://vueuse.org/shared/watchArray/).

Items are compared by identity (`===`) with duplicate-safe matching: each old
item is consumed by at most one new item, so reorders and repeated values diff
correctly. Wraps Svelte's `$effect`, so a fresh array assignment triggers it.

## Signature

```ts
import { watchArray } from '@wynn-dev/svelte-use';

const stop = watchArray(
	() => ids,
	(value, oldValue, added, removed) => {
		sync(added, removed);
	}
);

stop();
```

## Parameters

| Parameter | Type                    | Default | Description                                                            |
| --------- | ----------------------- | ------- | ---------------------------------------------------------------------- |
| `source`  | `MaybeGetter<T[]>`      | -       | Array, or a getter over reactive state.                                |
| `cb`      | `WatchArrayCallback<T>` | -       | Called per change with `(value, oldValue, added, removed, onCleanup)`. |
| `options` | `WatchArrayOptions`     | `{}`    | See below.                                                             |

| Option      | Type      | Default | Description                                                     |
| ----------- | --------- | ------- | --------------------------------------------------------------- |
| `immediate` | `boolean` | `false` | Fire on mount with `oldValue`/`removed` empty and `added` full. |

## Returns

| Type         | Description                                |
| ------------ | ------------------------------------------ |
| `() => void` | Stop watching and run the pending cleanup. |

## Notes

- `added` and `removed` preserve encounter order.
- `onCleanup` runs before the next callback, on `stop()`, and when the owning
  component unmounts.

## Examples

### Sync a DOM list to state

```svelte
<script lang="ts">
	import { watchArray } from '@wynn-dev/svelte-use';

	let items = $state([{ id: 1 }]);

	watchArray(
		() => items,
		(_value, _old, added, removed) => {
			for (const item of removed) teardown(item);
			for (const item of added) setup(item);
		}
	);
</script>
```

## SSR

Safe to construct on the server: `$effect` is inert, so the callback never runs.
The returned stop function is safe to call.
